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

    const userId = session.user.id;

    // 1. Fetch all dues
    const allDues = await prisma.due.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch user's payments
    const userPayments = await prisma.payment.findMany({
      where: { 
        userId,
        status: 'COMPLETED'
      },
    });

    // 3. Calculate stats
    const paidDueIds = new Set(userPayments.map(p => p.dueId));
    
    const duesWithStatus = allDues.map(due => ({
      ...due,
      isPaid: paidDueIds.has(due.id)
    }));

    const totalDuesAmount = allDues.reduce((sum, due) => sum + due.amount, 0);
    const totalPaidAmount = userPayments.reduce((sum, p) => sum + p.amount, 0);
    const amountOwed = totalDuesAmount - totalPaidAmount;
    
    // Avoid division by zero
    const percentagePaid = totalDuesAmount > 0 
      ? (totalPaidAmount / totalDuesAmount) * 100 
      : 100;

    return NextResponse.json({
      dues: duesWithStatus,
      stats: {
        totalDuesAmount,
        totalPaidAmount,
        amountOwed,
        percentagePaid
      }
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}