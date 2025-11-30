import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { 
        userId: session.user.id,
        amount: { gt: 0 } // Filter out 0 amount payments
      },
      include: {
        due: {
          select: {
            title: true,
            type: true,
          }
        }
      },
      orderBy: { paidAt: 'desc' },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { dueId, dueIds } = body;

    const idsToPay = dueIds || (dueId ? [dueId] : []);

    if (idsToPay.length === 0) {
      return NextResponse.json({ error: 'No dues selected' }, { status: 400 });
    }

    // 1. Fetch dues to get amounts
    const dues = await prisma.due.findMany({
      where: { id: { in: idsToPay } }
    });

    const now = new Date();

    // 2. Create payments with penalty logic
    const payments = await prisma.$transaction(
      dues.map((due) => {
        const isOverdue = new Date(due.dueDate) < now;
        const amountToPay = isOverdue ? due.amount * 2 : due.amount;

        return prisma.payment.create({
          data: {
            amount: amountToPay,
            status: 'COMPLETED',
            userId: session.user.id,
            dueId: due.id,
            paidAt: new Date(),
          }
        });
      })
    );

    return NextResponse.json({ message: 'Payment successful', count: payments.length }, { status: 201 });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}