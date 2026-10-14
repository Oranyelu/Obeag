import { NextResponse } from 'next/server';
import { generateOcubyteCheckoutUrl } from '@/lib/ocubyte';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { amount, purpose, dueIds, description } = body;

    const email = body.email || session?.user?.email;
    const name = body.name || session?.user?.name || undefined;
    const userId = body.userId || session?.user?.id;

    if (!amount || Number(amount) <= 0 || !email) {
      return NextResponse.json(
        { error: 'Valid payment amount and email are required.' },
        { status: 400 }
      );
    }

    if (!purpose || (purpose !== 'WALLET_FUNDING' && purpose !== 'DUE_PAYMENT')) {
      return NextResponse.json(
        { error: 'Valid payment purpose is required (WALLET_FUNDING or DUE_PAYMENT).' },
        { status: 400 }
      );
    }

    const finalAmount = Number(amount);
    const ids: string[] = Array.isArray(dueIds) ? dueIds : dueIds ? [dueIds] : [];

    // 1. Generate signed checkout URL
    const { checkoutUrl, reference } = generateOcubyteCheckoutUrl({
      amount: finalAmount,
      email,
      name,
      purpose,
      userId,
      dueIds: ids,
      description,
    });

    // 2. Pre-record PENDING record in OBEAG database
    if (purpose === 'WALLET_FUNDING') {
      if (!userId) {
        return NextResponse.json({ error: 'User must be authenticated to fund wallet.' }, { status: 401 });
      }

      await prisma.walletTransaction.create({
        data: {
          reference,
          userId,
          amount: finalAmount,
          purpose: 'WALLET_FUNDING',
          type: 'CREDIT',
          channel: 'OCUBYTE',
          status: 'PENDING',
          description: description || `Initiated Ocubyte wallet funding for ₦${finalAmount.toLocaleString()}`,
        },
      });
    } else if (purpose === 'DUE_PAYMENT') {
      if (!userId) {
        return NextResponse.json({ error: 'User must be authenticated to settle dues.' }, { status: 401 });
      }

      if (ids.length === 0) {
        return NextResponse.json({ error: 'At least one due item must be selected.' }, { status: 400 });
      }

      const dues = await prisma.due.findMany({
        where: { id: { in: ids } },
      });

      for (const due of dues) {
        const existing = await prisma.payment.findFirst({
          where: { userId, dueId: due.id },
        });

        if (existing) {
          await prisma.payment.update({
            where: { id: existing.id },
            data: {
              reference,
              channel: 'OCUBYTE',
              status: 'PENDING',
              amount: due.amount,
            },
          });
        } else {
          await prisma.payment.create({
            data: {
              userId,
              dueId: due.id,
              amount: due.amount,
              reference,
              channel: 'OCUBYTE',
              status: 'PENDING',
            },
          });
        }
      }
    }

    // 3. Return URL and reference to frontend for browser redirect
    return NextResponse.json({
      success: true,
      checkoutUrl,
      redirectUrl: checkoutUrl,
      reference,
      amount: finalAmount,
      purpose,
    });
  } catch (error: any) {
    console.error('[Payment Initiate Error]:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate checkout session' }, { status: 500 });
  }
}
