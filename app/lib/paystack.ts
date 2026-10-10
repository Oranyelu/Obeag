import crypto from 'crypto';
import { prisma } from '@/app/lib/prisma';

export interface PaystackInitParams {
  email: string;
  amount: number; // in Naira
  callbackUrl?: string;
  reference?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number; // in Kobo
    currency: string;
    paid_at: string;
    customer: {
      id: number;
      email: string;
    };
    metadata?: {
      userId?: string;
      purpose?: 'WALLET_FUNDING' | 'DUE_PAYMENT';
      dueIds?: string[];
      amountInNaira?: number;
      [key: string]: unknown;
    };
  };
}

/**
 * Returns whether Paystack is configured with API keys.
 */
export function isPaystackConfigured(): boolean {
  return Boolean(process.env.PAYSTACK_SECRET_KEY && process.env.PAYSTACK_SECRET_KEY.trim().length > 0);
}

/**
 * Generates a unique OBEAG transaction reference.
 */
export function generatePaystackReference(prefix: 'WALLET' | 'DUE' = 'WALLET'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `OBEAG_${prefix}_${timestamp}_${random}`;
}

/**
 * Initializes an online Paystack transaction.
 */
export async function initializeTransaction(params: PaystackInitParams): Promise<PaystackInitResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Paystack secret key is not configured. Please set PAYSTACK_SECRET_KEY in your environment variables.');
  }

  const reference = params.reference || generatePaystackReference();
  const amountInKobo = Math.round(params.amount * 100);

  const payload = {
    email: params.email,
    amount: amountInKobo,
    reference,
    callback_url: params.callbackUrl,
    metadata: {
      ...params.metadata,
      amountInNaira: params.amount,
    },
  };

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.error('Paystack initialize error:', data);
    throw new Error(data.message || 'Failed to initialize Paystack transaction');
  }

  return data;
}

/**
 * Verifies a transaction reference directly against Paystack's API.
 */
export async function verifyTransaction(reference: string): Promise<PaystackVerifyResponse> {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Paystack secret key is not configured.');
  }

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${secretKey.trim()}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.error('Paystack verify error:', data);
    throw new Error(data.message || 'Failed to verify Paystack transaction');
  }

  return data;
}

/**
 * Validates Paystack webhook HMAC SHA-512 signature.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !signature) return false;

  const expectedSignature = crypto
    .createHmac('sha512', secretKey.trim())
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Idempotently fulfills a verified Paystack payment.
 * Handles both WALLET_FUNDING and DUE_PAYMENT.
 */
export async function fulfillPayment(verifyData: PaystackVerifyResponse['data']): Promise<{
  success: boolean;
  message: string;
  purpose?: string;
  amount: number;
}> {
  const { status, reference, amount: amountInKobo, metadata, paid_at } = verifyData;

  if (status !== 'success') {
    return {
      success: false,
      message: `Transaction status is "${status}", not successful.`,
      amount: 0,
    };
  }

  const amountInNaira = metadata?.amountInNaira || amountInKobo / 100;
  const purpose = metadata?.purpose;
  const userId = metadata?.userId;

  if (!userId) {
    throw new Error('User ID missing from transaction metadata.');
  }

  // 1. CASE: WALLET FUNDING
  if (purpose === 'WALLET_FUNDING') {
    // Check if this reference has already been successfully processed
    const existingTx = await prisma.walletTransaction.findUnique({
      where: { reference },
    });

    if (existingTx && existingTx.status === 'SUCCESS') {
      return {
        success: true,
        message: 'Wallet transaction was already fulfilled.',
        purpose: 'WALLET_FUNDING',
        amount: existingTx.amount,
      };
    }

    // Execute wallet credit atomically
    await prisma.$transaction(async (tx) => {
      // Update User wallet balance
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            increment: amountInNaira,
          },
        },
      });

      // Upsert wallet transaction
      if (existingTx) {
        await tx.walletTransaction.update({
          where: { id: existingTx.id },
          data: {
            status: 'SUCCESS',
            amount: amountInNaira,
            channel: 'PAYSTACK',
            description: `Funded wallet via Paystack (${reference})`,
          },
        });
      } else {
        await tx.walletTransaction.create({
          data: {
            userId,
            amount: amountInNaira,
            type: 'CREDIT',
            purpose: 'WALLET_FUNDING',
            channel: 'PAYSTACK',
            reference,
            status: 'SUCCESS',
            description: `Funded wallet via Paystack (${reference})`,
          },
        });
      }

      // Create notification
      await tx.notification.create({
        data: {
          userId,
          title: 'Wallet Funded Successfully 💳',
          message: `Your wallet has been credited with ₦${amountInNaira.toLocaleString()} via Paystack. Your new funds are immediately available for dues settlement.`,
        },
      });
    });

    return {
      success: true,
      message: `Successfully credited wallet with ₦${amountInNaira.toLocaleString()}`,
      purpose: 'WALLET_FUNDING',
      amount: amountInNaira,
    };
  }

  // 2. CASE: DIRECT DUES PAYMENT VIA PAYSTACK
  if (purpose === 'DUE_PAYMENT') {
    const dueIds = metadata?.dueIds || [];
    if (!dueIds || dueIds.length === 0) {
      throw new Error('Due IDs missing from payment metadata.');
    }

    // Fetch dues
    const dues = await prisma.due.findMany({
      where: { id: { in: dueIds } },
    });

    if (dues.length === 0) {
      throw new Error('Dues not found for this payment.');
    }

    const paidDate = paid_at ? new Date(paid_at) : new Date();

    await prisma.$transaction(async (tx) => {
      for (const due of dues) {
        // Find existing payment if pending
        const existing = await tx.payment.findFirst({
          where: {
            userId,
            dueId: due.id,
          },
        });

        if (existing) {
          await tx.payment.update({
            where: { id: existing.id },
            data: {
              status: 'COMPLETED',
              paidAt: paidDate,
              channel: 'PAYSTACK',
              reference,
              amount: due.amount,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              userId,
              dueId: due.id,
              amount: due.amount,
              status: 'COMPLETED',
              paidAt: paidDate,
              channel: 'PAYSTACK',
              reference,
            },
          });
        }
      }

      // Notify user
      const dueTitles = dues.map((d) => d.title).join(', ');
      await tx.notification.create({
        data: {
          userId,
          title: 'Dues Settled Online 🎉',
          message: `Your online payment of ₦${amountInNaira.toLocaleString()} for "${dueTitles}" has been confirmed and verified via Paystack.`,
        },
      });
    });

    return {
      success: true,
      message: `Successfully paid dues: ${dues.map((d) => d.title).join(', ')}`,
      purpose: 'DUE_PAYMENT',
      amount: amountInNaira,
    };
  }

  return {
    success: false,
    message: `Unknown payment purpose: "${purpose}".`,
    amount: amountInNaira,
  };
}
