import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dueIds } = body;

    const ids: string[] = Array.isArray(dueIds) ? dueIds : dueIds ? [dueIds] : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'No dues selected for payment' }, { status: 400 });
    }

    // 1. Fetch user to check current wallet balance
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, walletBalance: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch requested dues
    const dues = await prisma.due.findMany({
      where: { id: { in: ids } },
    });

    if (dues.length === 0) {
      return NextResponse.json({ error: 'Dues not found' }, { status: 404 });
    }

    const totalAmount = dues.reduce((sum, d) => sum + d.amount, 0);

    // 3. Verify sufficient wallet balance
    if (user.walletBalance < totalAmount) {
      return NextResponse.json(
        { 
          error: `Insufficient wallet balance. You need ₦${totalAmount.toLocaleString()}, but your current wallet balance is ₦${user.walletBalance.toLocaleString()}. Please fund your wallet first or pay directly with Paystack.`,
          requiredAmount: totalAmount,
          walletBalance: user.walletBalance,
        },
        { status: 400 }
      );
    }

    // 4. Execute settlement in a transaction
    const now = new Date();
    const dueTitles = dues.map((d) => d.title).join(', ');

    const result = await prisma.$transaction(async (tx) => {
      // Deduct from wallet
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          walletBalance: {
            decrement: totalAmount,
          },
        },
      });

      // Create debit wallet transaction record
      const walletTx = await tx.walletTransaction.create({
        data: {
          userId: user.id,
          amount: totalAmount,
          type: 'DEBIT',
          purpose: 'DUE_PAYMENT',
          channel: 'WALLET',
          status: 'SUCCESS',
          description: `Settled dues: ${dueTitles}`,
        },
      });

      // Settle payments for each due
      for (const due of dues) {
        const existing = await tx.payment.findFirst({
          where: {
            userId: user.id,
            dueId: due.id,
          },
        });

        if (existing) {
          await tx.payment.update({
            where: { id: existing.id },
            data: {
              status: 'COMPLETED',
              paidAt: now,
              channel: 'WALLET',
              reference: walletTx.id,
              amount: due.amount,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              userId: user.id,
              dueId: due.id,
              amount: due.amount,
              status: 'COMPLETED',
              paidAt: now,
              channel: 'WALLET',
              reference: walletTx.id,
            },
          });
        }
      }

      // Create notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Dues Paid from Wallet',
          message: `Successfully paid ₦${totalAmount.toLocaleString()} for "${dueTitles}" from your wallet balance. Remaining balance: ₦${updatedUser.walletBalance.toLocaleString()}.`,
        },
      });

      return updatedUser.walletBalance;
    });

    return NextResponse.json({
      success: true,
      message: `Successfully paid ${dues.length} due(s) from your wallet!`,
      newWalletBalance: result,
      totalAmount,
    });

  } catch (error: unknown) {
    console.error('Wallet payment error:', error);
    const message = error instanceof Error ? error.message : 'Failed to pay dues from wallet';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
