import crypto from 'crypto';
import { prisma } from '@/app/lib/prisma';

export interface OcubyteInitParams {
  email: string;
  name?: string;
  amount: number; // in Naira
  purpose: 'WALLET_FUNDING' | 'DUE_PAYMENT';
  dueIds?: string[];
  dueTitles?: string[];
  userId: string;
  callbackUrl: string;
}

export interface OcubytePaymentPayload {
  redirectUrl: string;
  reference: string;
  amount: number;
  purpose: string;
}

/**
 * Returns Ocubyte configuration settings from environment.
 */
export function getOcubyteConfig() {
  const paymentUrl = process.env.OCUBYTE_PAYMENT_URL?.trim() || 'https://www.ocubyte.com/pay';
  const secretKey = process.env.OCUBYTE_SECRET_KEY?.trim() || 'ocubyte_sec_default_obeag';
  return { paymentUrl, secretKey };
}

/**
 * Generates a unique transaction reference for Ocubyte payments.
 */
export function generateOcubyteReference(prefix: 'WALLET' | 'DUE' = 'WALLET'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `OCUBYTE_${prefix}_${timestamp}_${random}`;
}

/**
 * Creates an HMAC SHA-256 signature for payload verification.
 */
export function createOcubyteSignature(params: {
  reference: string;
  amount: number;
  purpose: string;
  userId?: string;
  email?: string;
}): string {
  const { secretKey } = getOcubyteConfig();
  const rawString = `${params.reference}|${params.amount}|${params.purpose}|${params.userId || ''}|${params.email || ''}`;
  return crypto.createHmac('sha256', secretKey).update(rawString).digest('hex');
}

/**
 * Validates an HMAC SHA-256 signature.
 */
export function verifyOcubyteSignature(
  params: {
    reference: string;
    amount: number;
    purpose: string;
    userId?: string;
    email?: string;
  },
  signature: string | null
): boolean {
  if (!signature) return false;
  const expected = createOcubyteSignature(params);
  return expected.toLowerCase() === signature.toLowerCase();
}

/**
 * Builds the secure redirect URL to Ocubyte's payment service.
 */
export function buildOcubyteRedirectUrl(params: OcubyteInitParams & { reference: string }): string {
  const { paymentUrl } = getOcubyteConfig();

  const signature = createOcubyteSignature({
    reference: params.reference,
    amount: params.amount,
    purpose: params.purpose,
    userId: params.userId,
    email: params.email,
  });

  const url = new URL(paymentUrl);
  url.searchParams.set('reference', params.reference);
  url.searchParams.set('amount', params.amount.toString());
  url.searchParams.set('email', params.email);
  if (params.name) url.searchParams.set('name', params.name);
  url.searchParams.set('purpose', params.purpose);
  url.searchParams.set('callback_url', params.callbackUrl);
  url.searchParams.set('signature', signature);
  url.searchParams.set('app', 'obeag');
  url.searchParams.set('currency', 'NGN');

  if (params.dueIds && params.dueIds.length > 0) {
    url.searchParams.set('due_ids', params.dueIds.join(','));
  }
  if (params.dueTitles && params.dueTitles.length > 0) {
    url.searchParams.set('description', params.dueTitles.join(', '));
  }

  return url.toString();
}

/**
 * Idempotently fulfills a confirmed Ocubyte payment.
 */
export async function fulfillOcubytePayment({
  reference,
  amount,
  purpose,
  userId,
  dueIds,
}: {
  reference: string;
  amount?: number;
  purpose?: 'WALLET_FUNDING' | 'DUE_PAYMENT' | string;
  userId?: string;
  dueIds?: string[];
}): Promise<{
  success: boolean;
  message: string;
  amount: number;
  purpose: string;
}> {
  // 1. Check existing wallet transaction record
  const existingTx = await prisma.walletTransaction.findUnique({
    where: { reference },
  });

  // 2. Check existing payments records
  const existingPayments = await prisma.payment.findMany({
    where: { reference },
    include: { due: true },
  });

  // Determine effective values
  const effectivePurpose: string =
    purpose ||
    (existingTx
      ? 'WALLET_FUNDING'
      : existingPayments.length > 0
      ? 'DUE_PAYMENT'
      : reference.includes('WALLET')
      ? 'WALLET_FUNDING'
      : 'DUE_PAYMENT');

  const effectiveUserId =
    userId || existingTx?.userId || (existingPayments.length > 0 ? existingPayments[0].userId : undefined);

  if (!effectiveUserId) {
    throw new Error(`Unable to determine user ID for transaction reference: ${reference}`);
  }

  // 1. CASE: WALLET FUNDING
  if (effectivePurpose === 'WALLET_FUNDING') {
    const finalAmount = amount || existingTx?.amount || 0;
    if (finalAmount <= 0) {
      throw new Error(`Invalid amount for wallet funding transaction reference: ${reference}`);
    }

    if (existingTx && existingTx.status === 'SUCCESS') {
      return {
        success: true,
        message: 'Wallet transaction was already fulfilled.',
        amount: existingTx.amount,
        purpose: 'WALLET_FUNDING',
      };
    }

    await prisma.$transaction(async (tx) => {
      // Credit wallet
      await tx.user.update({
        where: { id: effectiveUserId },
        data: {
          walletBalance: {
            increment: finalAmount,
          },
        },
      });

      // Update or create transaction record
      if (existingTx) {
        await tx.walletTransaction.update({
          where: { id: existingTx.id },
          data: {
            status: 'SUCCESS',
            amount: finalAmount,
            channel: 'OCUBYTE',
            description: `Funded wallet via Ocubyte (${reference})`,
          },
        });
      } else {
        await tx.walletTransaction.create({
          data: {
            userId: effectiveUserId,
            amount: finalAmount,
            type: 'CREDIT',
            purpose: 'WALLET_FUNDING',
            channel: 'OCUBYTE',
            reference,
            status: 'SUCCESS',
            description: `Funded wallet via Ocubyte (${reference})`,
          },
        });
      }

      // Send notification
      await tx.notification.create({
        data: {
          userId: effectiveUserId,
          title: 'Wallet Funded via Ocubyte 🛡️',
          message: `Your wallet has been credited with ₦${finalAmount.toLocaleString()} through Ocubyte Secured Payment. Available immediately for dues settlement.`,
        },
      });
    });

    return {
      success: true,
      message: `Successfully credited wallet with ₦${finalAmount.toLocaleString()}`,
      amount: finalAmount,
      purpose: 'WALLET_FUNDING',
    };
  }

  // 2. CASE: DIRECT DUES PAYMENT
  if (effectivePurpose === 'DUE_PAYMENT') {
    const targetDueIds =
      dueIds && dueIds.length > 0
        ? dueIds
        : existingPayments.map((p) => p.dueId);

    const dues = await prisma.due.findMany({
      where: { id: { in: targetDueIds } },
    });

    if (dues.length === 0) {
      throw new Error('Dues not found for this payment reference.');
    }

    const calculatedTotal = dues.reduce((sum, d) => sum + d.amount, 0);
    const finalAmount = amount || calculatedTotal;

    // Check if already fulfilled
    const allAlreadyCompleted =
      existingPayments.length > 0 &&
      existingPayments.every((p) => p.status === 'COMPLETED');
    if (allAlreadyCompleted) {
      return {
        success: true,
        message: `Dues payment was already fulfilled (${dues.map((d) => d.title).join(', ')}).`,
        amount: finalAmount,
        purpose: 'DUE_PAYMENT',
      };
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const due of dues) {
        const existing = await tx.payment.findFirst({
          where: {
            userId: effectiveUserId,
            dueId: due.id,
          },
        });

        if (existing) {
          await tx.payment.update({
            where: { id: existing.id },
            data: {
              status: 'COMPLETED',
              paidAt: now,
              channel: 'OCUBYTE',
              reference,
              amount: due.amount,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              userId: effectiveUserId,
              dueId: due.id,
              amount: due.amount,
              status: 'COMPLETED',
              paidAt: now,
              channel: 'OCUBYTE',
              reference,
            },
          });
        }
      }

      const dueTitles = dues.map((d) => d.title).join(', ');
      await tx.notification.create({
        data: {
          userId: effectiveUserId,
          title: 'Dues Settled via Ocubyte 🎉',
          message: `Your payment of ₦${finalAmount.toLocaleString()} for "${dueTitles}" has been confirmed through Ocubyte Secured Payment.`,
        },
      });
    });

    return {
      success: true,
      message: `Successfully settled dues: ${dues.map((d) => d.title).join(', ')}`,
      amount: finalAmount,
      purpose: 'DUE_PAYMENT',
    };
  }

  return {
    success: false,
    message: `Unknown payment purpose: "${effectivePurpose}".`,
    amount: amount || 0,
    purpose: effectivePurpose,
  };
}
