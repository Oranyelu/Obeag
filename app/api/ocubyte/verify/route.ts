import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  fulfillOcubytePayment,
  verifyOcubyteSignature,
} from '@/app/lib/ocubyte';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference');
    const signature = searchParams.get('signature');
    const status = searchParams.get('status')?.toLowerCase();
    const amountStr = searchParams.get('amount');
    const purpose = searchParams.get('purpose') || undefined;

    if (!reference) {
      return NextResponse.json(
        { error: 'Transaction reference is required for verification.' },
        { status: 400 }
      );
    }

    // Handle user cancellation on Ocubyte portal
    if (status === 'cancelled' || status === 'failed') {
      await prisma.walletTransaction.updateMany({
        where: { reference, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      await prisma.payment.updateMany({
        where: { reference, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      return NextResponse.json(
        { success: false, error: 'Payment was cancelled or failed on Ocubyte.' },
        { status: 400 }
      );
    }

    const amount = amountStr ? parseFloat(amountStr) : undefined;

    // If signature was passed, verify it if possible
    if (signature && amount && purpose) {
      const isValidSig = verifyOcubyteSignature(
        { reference, amount, purpose },
        signature
      );
      if (!isValidSig) {
        console.warn(`Ocubyte signature mismatch for reference: ${reference}`);
      }
    }

    // Fulfill payment idempotently
    const fulfillment = await fulfillOcubytePayment({
      reference,
      amount,
      purpose,
    });

    return NextResponse.json({
      success: fulfillment.success,
      message: fulfillment.message,
      purpose: fulfillment.purpose,
      amount: fulfillment.amount,
      reference,
    });

  } catch (error: unknown) {
    console.error('Ocubyte verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify Ocubyte payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { reference, signature, status, amount, purpose, dueIds } = body;

    if (!reference) {
      return NextResponse.json(
        { error: 'Transaction reference is required for verification.' },
        { status: 400 }
      );
    }

    if (status === 'cancelled' || status === 'failed') {
      await prisma.walletTransaction.updateMany({
        where: { reference, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      await prisma.payment.updateMany({
        where: { reference, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      return NextResponse.json(
        { success: false, error: 'Payment was cancelled or failed on Ocubyte.' },
        { status: 400 }
      );
    }

    const parsedAmount = amount ? parseFloat(amount) : undefined;

    if (signature && parsedAmount && purpose) {
      const isValidSig = verifyOcubyteSignature(
        { reference, amount: parsedAmount, purpose, userId: session?.user?.id },
        signature
      );
      if (!isValidSig) {
        console.warn(`Ocubyte POST signature mismatch for reference: ${reference}`);
      }
    }

    const fulfillment = await fulfillOcubytePayment({
      reference,
      amount: parsedAmount,
      purpose,
      userId: session?.user?.id,
      dueIds,
    });

    return NextResponse.json({
      success: fulfillment.success,
      message: fulfillment.message,
      purpose: fulfillment.purpose,
      amount: fulfillment.amount,
      reference,
    });

  } catch (error: unknown) {
    console.error('Ocubyte post verification error:', error);
    const message = error instanceof Error ? error.message : 'Failed to verify Ocubyte payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
