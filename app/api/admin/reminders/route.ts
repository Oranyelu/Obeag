import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendEmail } from '@/app/lib/email';

export async function GET() {
  try {
    // 1. Get all overdue dues
    const overdueDues = await prisma.due.findMany({
      where: {
        dueDate: { lt: new Date() }
      }
    });

    if (overdueDues.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Get all users with their payments
    const users = await prisma.user.findMany({
      include: {
        payments: {
          where: { status: 'COMPLETED' },
          select: { dueId: true }
        }
      }
    });

    const defaulters = [];

    for (const user of users) {
      const paidDueIds = new Set(user.payments.map(p => p.dueId));
      const userOverdueDues = overdueDues.filter(due => !paidDueIds.has(due.id));

      if (userOverdueDues.length > 0) {
        const amountOwed = userOverdueDues.reduce((sum, due) => sum + due.amount, 0);
        defaulters.push({
          id: user.id,
          name: user.name,
          email: user.email,
          amountOwed,
          overdueCount: userOverdueDues.length
        });
      }
    }

    return NextResponse.json(defaulters);

  } catch (error) {
    console.error('Error fetching defaulters:', error);
    return NextResponse.json({ error: 'Failed to fetch defaulters' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})); // Handle empty body
    const { userId } = body;

    // 1. Get all overdue dues
    const overdueDues = await prisma.due.findMany({
      where: {
        dueDate: { lt: new Date() }
      }
    });

    if (overdueDues.length === 0) {
      return NextResponse.json({ message: 'No overdue dues found', count: 0 });
    }

    // 2. Get users (either one or all)
    const whereClause = userId ? { id: userId } : {};
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        payments: {
          where: { status: 'COMPLETED' },
          select: { dueId: true }
        }
      }
    });

    let emailsSent = 0;

    // 3. Check each user
    for (const user of users) {
      const paidDueIds = new Set(user.payments.map(p => p.dueId));
      const userOverdueDues = overdueDues.filter(due => !paidDueIds.has(due.id));

      if (userOverdueDues.length > 0) {
        // 4. Send Email
        const dueListHtml = userOverdueDues
          .map(d => `<li><strong>${d.title}</strong>: ${d.amount.toLocaleString()} (Due: ${new Date(d.dueDate).toLocaleDateString()})</li>`)
          .join('');

        await sendEmail({
          to: user.email,
          subject: 'Urgent: Overdue Association Dues',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h1 style="color: #8B4513;">Payment Reminder</h1>
              <p>Dear ${user.name || 'Member'},</p>
              <p>We noticed that you have the following outstanding dues that are past their due date:</p>
              <ul>${dueListHtml}</ul>
              <p>Please log in to your dashboard and clear these dues as soon as possible.</p>
              <br/>
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="background-color: #8B4513; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
              <br/><br/>
              <p style="font-size: 12px; color: #888;">OBEAG Admin</p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    return NextResponse.json({ message: 'Reminders sent', count: emailsSent });

  } catch (error) {
    console.error('Reminder error:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}