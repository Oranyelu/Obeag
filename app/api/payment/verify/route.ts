import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { verifyWithOcubyteGateway, fulfillOcubytePayment } from '@/app/lib/ocubyte';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference } = body;

    if (!reference) {
      return NextResponse.json(
        { success: false, verified: false, error: 'Transaction reference is required for verification.' },
        { status: 400 }
      );
    }

    // 1. Direct Server-to-Server (S2S) Verification with Ocubyte Gateway
    const s2sResult = await verifyWithOcubyteGateway(reference);

    if (!s2sResult.verified || !s2sResult.data) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: s2sResult.error || 'Transaction could not be verified on Ocubyte Gateway.',
        },
        { status: 400 }
      );
    }

    const tx = s2sResult.data;
    const verifiedAmount = Number(tx.amount);
    const purpose = tx.metadata?.purpose || tx.purpose;
    const userId = tx.metadata?.userId || tx.userId;
    const dueIds = tx.metadata?.due_ids
      ? typeof tx.metadata.due_ids === 'string'
        ? tx.metadata.due_ids.split(',').filter(Boolean)
        : tx.metadata.due_ids
      : undefined;

    // 2. Idempotent Settlement in OBEAG database
    const fulfillment = await fulfillOcubytePayment({
      reference,
      amount: verifiedAmount,
      purpose,
      userId,
      dueIds,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      amount: fulfillment.amount,
      purpose: fulfillment.purpose,
      reference,
      message: fulfillment.message,
    });
  } catch (error: any) {
    console.error('[OBEAG Verify Error]:', error);
    return NextResponse.json(
      { success: false, verified: false, error: error.message || 'Verification failed.' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      return NextResponse.json({ success: false, error: 'Reference parameter is required' }, { status: 400 });
    }

    const s2sResult = await verifyWithOcubyteGateway(reference);
    if (!s2sResult.verified || !s2sResult.data) {
      return NextResponse.json(
        { success: false, verified: false, error: s2sResult.error || 'Verification failed on gateway' },
        { status: 400 }
      );
    }

    const tx = s2sResult.data;
    const fulfillment = await fulfillOcubytePayment({
      reference,
      amount: Number(tx.amount),
      purpose: tx.metadata?.purpose || tx.purpose,
      userId: tx.metadata?.userId || tx.userId,
    });

    return NextResponse.json({
      success: true,
      verified: true,
      amount: fulfillment.amount,
      purpose: fulfillment.purpose,
      reference,
      message: fulfillment.message,
    });
  } catch (error: any) {
    console.error('[OBEAG GET Verify Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
