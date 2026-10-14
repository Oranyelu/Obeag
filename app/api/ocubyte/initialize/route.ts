import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';
import {
  generateOcubyteReference,
  buildOcubyteRedirectUrl,
} from '@/app/lib/ocubyte';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json(
        { error: 'User must be authenticated with a valid email address.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { purpose, amount, dueIds } = body;

    if (!purpose || (purpose !== 'WALLET_FUNDING' && purpose !== 'DUE_PAYMENT')) {
      return NextResponse.json(
        { error: 'Valid payment purpose is required (WALLET_FUNDING or DUE_PAYMENT)' },
        { status: 400 }
      );
    }

    let finalAmount = 0;
    let selectedDues: { id: string; title: string; amount: number }[] = [];

    // 1. WALLET FUNDING
    if (purpose === 'WALLET_FUNDING') {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 100) {
        return NextResponse.json(
          { error: 'Minimum wallet funding amount is ₦100' },
          { status: 400 }
        );
      }
      finalAmount = parsedAmount;
    }
    // 2. DUE PAYMENT
    else if (purpose === 'DUE_PAYMENT') {
      const ids: string[] = Array.isArray(dueIds) ? dueIds : dueIds ? [dueIds] : [];
      if (ids.length === 0) {
        return NextResponse.json(
          { error: 'No dues selected for payment' },
          { status: 400 }
        );
      }

      selectedDues = await prisma.due.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, amount: true },
      });

      if (selectedDues.length === 0) {
        return NextResponse.json(
          { error: 'Selected dues could not be found' },
          { status: 404 }
        );
      }

      finalAmount = selectedDues.reduce((sum, d) => sum + d.amount, 0);
    }

    // Determine absolute callback URL (supports production domain https://ohabuenyi.vercel.app)
    const baseUrl =
      process.env.APP_URL?.replace(/\/+$/, '') ||
      (() => {
        const host = request.headers.get('host') || 'ohabuenyi.vercel.app';
        const protocol = request.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
        return `${protocol}://${host}`;
      })();
    const callbackUrl = `${baseUrl}/payment/callback`;

    const reference = generateOcubyteReference(purpose === 'WALLET_FUNDING' ? 'WALLET' : 'DUE');

    // Pre-record pending transaction in database to track the intent
    if (purpose === 'WALLET_FUNDING') {
      await prisma.walletTransaction.create({
        data: {
          userId: session.user.id,
          amount: finalAmount,
          type: 'CREDIT',
          purpose: 'WALLET_FUNDING',
          channel: 'OCUBYTE',
          reference,
          status: 'PENDING',
          description: `Initiated Ocubyte secured wallet funding for ₦${finalAmount.toLocaleString()}`,
        },
      });
    } else if (purpose === 'DUE_PAYMENT') {
      for (const due of selectedDues) {
        const existing = await prisma.payment.findFirst({
          where: {
            userId: session.user.id,
            dueId: due.id,
          },
        });

        if (existing) {
          await prisma.payment.update({
            where: { id: existing.id },
            data: {
              status: 'PENDING',
              channel: 'OCUBYTE',
              reference,
              amount: due.amount,
            },
          });
        } else {
          await prisma.payment.create({
            data: {
              userId: session.user.id,
              dueId: due.id,
              amount: due.amount,
              status: 'PENDING',
              channel: 'OCUBYTE',
              reference,
            },
          });
        }
      }
    }

    // Build the secure redirect URL with query params & HMAC signature
    const redirectUrl = buildOcubyteRedirectUrl({
      reference,
      amount: finalAmount,
      purpose,
      email: session.user.email,
      name: session.user.name || undefined,
      userId: session.user.id,
      callbackUrl,
      dueIds: selectedDues.map((d) => d.id),
      dueTitles: selectedDues.map((d) => d.title),
    });

    return NextResponse.json({
      success: true,
      redirectUrl,
      reference,
      amount: finalAmount,
      purpose,
    });

  } catch (error: unknown) {
    console.error('Ocubyte initialize error:', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize Ocubyte payment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
