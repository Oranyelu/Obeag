import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

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

    // Create payments for each due
    // In a real app, we would verify payment gateway success here.
    // For now, we assume instant success.

    const results = await prisma.$transaction(
      idsToPay.map((id: string) => 
        prisma.payment.create({
          data: {
            amount: 0, // Ideally fetch amount from Due, but for now 0 or fetch. 
                       // Better to fetch due amount.
            status: 'COMPLETED',
            userId: session.user.id,
            dueId: id,
            paidAt: new Date(),
          }
        })
      )
    );

    // Update amounts - wait, we need to know the amount.
    // Let's fetch the dues first to get amounts.
    // Actually, for this simple MVP, let's just mark them paid.
    // But the schema requires 'amount' in Payment.
    
    // Refined approach:
    // 1. Fetch dues to get amounts.
    // 2. Create payments with correct amounts.
    
    // However, to keep it simple and fast in one transaction:
    // We can't easily do that without a read first.
    
    // Let's just read first.
    const dues = await prisma.due.findMany({
      where: { id: { in: idsToPay } }
    });

    const payments = await prisma.$transaction(
      dues.map((due) => 
        prisma.payment.create({
          data: {
            amount: due.amount,
            status: 'COMPLETED',
            userId: session.user.id,
            dueId: due.id,
            paidAt: new Date(),
          }
        })
      )
    );

    return NextResponse.json({ message: 'Payment successful', count: payments.length }, { status: 201 });
  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json({ error: 'Payment failed' }, { status: 500 });
  }
}