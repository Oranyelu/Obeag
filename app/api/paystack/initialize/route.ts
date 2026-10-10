import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';
import { initializeTransaction, isPaystackConfigured, generatePaystackReference } from '@/app/lib/paystack';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'User must be logged in with a valid email address' }, { status: 401 });
    }

    if (!isPaystackConfigured()) {
      return NextResponse.json(
        { 
          error: 'Paystack is not configured yet. Please configure PAYSTACK_SECRET_KEY in your server environment.',
          notConfigured: true 
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { purpose, amount, dueIds } = body;

    if (!purpose || (purpose !== 'WALLET_FUNDING' && purpose !== 'DUE_PAYMENT')) {
      return NextResponse.json({ error: 'Valid payment purpose is required (WALLET_FUNDING or DUE_PAYMENT)' }, { status: 400 });
    }

    let finalAmount = 0;
    let selectedDues: { id: string; title: string; amount: number }[] = [];

    if (purpose === 'WALLET_FUNDING') {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 100) {
        return NextResponse.json({ error: 'Minimum wallet funding amount is ₦100' }, { status: 400 });
      }
      finalAmount = parsedAmount;
    } else if (purpose === 'DUE_PAYMENT') {
      const ids: string[] = Array.isArray(dueIds) ? dueIds : dueIds ? [dueIds] : [];
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No dues selected for payment' }, { status: 400 });
      }

      selectedDues = await prisma.due.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, amount: true },
      });

      if (selectedDues.length === 0) {
        return NextResponse.json({ error: 'Selected dues not found' }, { status: 404 });
      }

      finalAmount = selectedDues.reduce((sum, d) => sum + d.amount, 0);
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
    const callbackUrl = `${protocol}://${host}/payment/callback`;

    const reference = generatePaystackReference(purpose === 'WALLET_FUNDING' ? 'WALLET' : 'DUE');

    // Initialize Paystack transaction
    const paystackResponse = await initializeTransaction({
      email: session.user.email,
      amount: finalAmount,
      callbackUrl,
      reference,
      metadata: {
        userId: session.user.id,
        userName: session.user.name,
        purpose,
        dueIds: selectedDues.map((d) => d.id),
        dueTitles: selectedDues.map((d) => d.title),
      },
    });

    // If wallet funding, optionally create a PENDING transaction record
    if (purpose === 'WALLET_FUNDING') {
      await prisma.walletTransaction.create({
        data: {
          userId: session.user.id,
          amount: finalAmount,
          type: 'CREDIT',
          purpose: 'WALLET_FUNDING',
          channel: 'PAYSTACK',
          reference,
          status: 'PENDING',
          description: `Initiated Paystack funding for ₦${finalAmount.toLocaleString()}`,
        },
      });
    }

    return NextResponse.json({
      authorizationUrl: paystackResponse.data.authorization_url,
      accessCode: paystackResponse.data.access_code,
      reference,
      amount: finalAmount,
      purpose,
    });

  } catch (error: unknown) {
    console.error('Paystack initialize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
