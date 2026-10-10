import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { verifyTransaction, fulfillPayment, isPaystackConfigured } from '@/app/lib/paystack';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    if (!isPaystackConfigured()) {
      return NextResponse.json({ error: 'Paystack is not configured on the server.' }, { status: 503 });
    }

    // Verify transaction with Paystack API
    const verifyResult = await verifyTransaction(reference);

    if (!verifyResult.status || !verifyResult.data) {
      return NextResponse.json({ error: 'Unable to verify transaction with Paystack' }, { status: 400 });
    }

    // Fulfill payment (credit wallet or mark dues as completed)
    const fulfillment = await fulfillPayment(verifyResult.data);

    return NextResponse.json({
      success: fulfillment.success,
      message: fulfillment.message,
      purpose: fulfillment.purpose,
      amount: fulfillment.amount,
      data: {
        reference: verifyResult.data.reference,
        status: verifyResult.data.status,
        paidAt: verifyResult.data.paid_at,
      },
    });

  } catch (error: unknown) {
    console.error('Paystack verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 });
    }

    if (!isPaystackConfigured()) {
      return NextResponse.json({ error: 'Paystack is not configured on the server.' }, { status: 503 });
    }

    const verifyResult = await verifyTransaction(reference);
    const fulfillment = await fulfillPayment(verifyResult.data);

    return NextResponse.json({
      success: fulfillment.success,
      message: fulfillment.message,
      purpose: fulfillment.purpose,
      amount: fulfillment.amount,
    });

  } catch (error: unknown) {
    console.error('Paystack post verify error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify transaction';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
