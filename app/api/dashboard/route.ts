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

    // 3. Fetch recent notifications
    const recentNotifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    const unreadNotificationCount = await prisma.notification.count({
      where: { 
        userId,
        isRead: false 
      },
    });

    // 4. Calculate stats and penalties
    const paymentMap = new Map(userPayments.map(p => [p.dueId, p.amount]));
    const now = new Date();
    
    const duesWithStatus = allDues.map(due => {
      const paidAmount = paymentMap.get(due.id);
      const isPaid = paidAmount !== undefined;
      const isOverdue = new Date(due.dueDate) < now && !isPaid;
      
      // Determine the effective amount for this due
      let effectiveAmount = due.amount;
      
      if (isPaid) {
        // If paid, the effective amount is what was actually paid (handles cases where they paid penalty)
        effectiveAmount = paidAmount;
      } else if (isOverdue) {
        // If overdue and not paid, double the amount
        effectiveAmount = due.amount * 2;
      }

      return {
        ...due,
        isPaid,
        isOverdue,
        originalAmount: due.amount,
        amount: effectiveAmount
      };
    });

    const totalDuesAmount = duesWithStatus.reduce((sum, due) => sum + due.amount, 0);
    const totalPaidAmount = userPayments.reduce((sum, p) => sum + p.amount, 0);
    const amountOwed = totalDuesAmount - totalPaidAmount;
    
    // Avoid division by zero
    const percentagePaid = totalDuesAmount > 0 
      ? (totalPaidAmount / totalDuesAmount) * 100 
      : 100;

    return NextResponse.json({
      dues: duesWithStatus,
      recentNotifications,
      unreadNotificationCount,
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