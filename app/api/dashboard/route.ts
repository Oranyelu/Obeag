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

    // 2. Fetch all user's payments
    const userPayments = await prisma.payment.findMany({
      where: { userId },
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

    // 3b. Fetch upcoming meetings
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' },
      take: 3
    });

    // 4. Map dues status based on payments
    const duesWithStatus = allDues.map(due => {
      // Find latest payment for this due
      const paymentsForDue = userPayments.filter(p => p.dueId === due.id);
      
      let isPaid = false;
      let isPending = false;
      let isFailed = false;

      if (paymentsForDue.length > 0) {
        // Sort to get the most recent payment state
        paymentsForDue.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
        const latestPayment = paymentsForDue[0];

        isPaid = latestPayment.status === 'COMPLETED';
        isPending = latestPayment.status === 'PENDING';
        isFailed = latestPayment.status === 'FAILED';
      }

      return {
        id: due.id,
        title: due.title,
        description: due.description,
        amount: due.amount,
        originalAmount: due.amount,
        type: due.type,
        dueDate: due.dueDate.toISOString(),
        isPaid,
        isPending,
        isFailed,
        isOverdue: new Date(due.dueDate) < new Date() && !isPaid
      };
    });

    // 5. Calculate Stats
    const totalDuesAmount = allDues.reduce((sum, due) => sum + due.amount, 0);
    const completedPayments = userPayments.filter(p => p.status === 'COMPLETED');
    const totalPaidAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const amountOwed = totalDuesAmount - totalPaidAmount;
    
    const percentagePaid = totalDuesAmount > 0 
      ? (totalPaidAmount / totalDuesAmount) * 100 
      : 100;

    return NextResponse.json({
      dues: duesWithStatus,
      recentNotifications,
      unreadNotificationCount,
      upcomingMeetings,
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