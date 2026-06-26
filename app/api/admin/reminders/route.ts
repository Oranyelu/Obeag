import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendEmail } from '@/app/lib/email';

export async function GET() {
  try {
    // Get all dues
    const dues = await prisma.due.findMany();

    if (dues.length === 0) {
      return NextResponse.json([]);
    }

    // Get all users with their payments
    const users = await prisma.user.findMany({
      where: { status: 'APPROVED' },
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
      const unpaidDues = dues.filter(due => !paidDueIds.has(due.id));

      if (unpaidDues.length > 0) {
        const amountOwed = unpaidDues.reduce((sum, due) => sum + due.amount, 0);
        defaulters.push({
          id: user.id,
          name: user.name,
          email: user.email,
          amountOwed,
          overdueCount: unpaidDues.length
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
    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    // 1. Get all dues
    const dues = await prisma.due.findMany();
    if (dues.length === 0) {
      return NextResponse.json({ message: 'No dues items exist in system', count: 0 });
    }

    // 2. Get all upcoming meetings
    const upcomingMeetings = await prisma.meeting.findMany({
      where: {
        date: { gte: new Date() }
      },
      orderBy: { date: 'asc' }
    });

    // 3. Get users (approved only, optionally filtered by userId)
    const whereClause = userId ? { id: userId, status: 'APPROVED' } : { status: 'APPROVED' };
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

    // 4. Send reminders to members
    for (const user of users) {
      const paidDueIds = new Set(user.payments.map(p => p.dueId));
      const unpaidDues = dues.filter(due => !paidDueIds.has(due.id));

      // Send reminder if they have unpaid dues OR if there are upcoming meetings
      if (unpaidDues.length > 0 || upcomingMeetings.length > 0) {
        
        let duesHtml = '<p>You have no outstanding dues. Thank you!</p>';
        if (unpaidDues.length > 0) {
          const dueListItems = unpaidDues
            .map(d => `<li><strong>${d.title}</strong>: ${d.amount.toLocaleString()} (Due: ${new Date(d.dueDate).toLocaleDateString()})</li>`)
            .join('');
          duesHtml = `<ul>${dueListItems}</ul>`;
        }

        let meetingsHtml = '<p>No upcoming meetings scheduled at this time.</p>';
        if (upcomingMeetings.length > 0) {
          const meetingListItems = upcomingMeetings
            .map(m => `<li><strong>${m.title}</strong><br/>🕒 ${new Date(m.date).toLocaleString()}<br/>📍 ${m.location || 'No location set'}</li>`)
            .join('');
          meetingsHtml = `<ul>${meetingListItems}</ul>`;
        }

        await sendEmail({
          to: user.email,
          subject: 'Monthly Update: Outstanding Dues & Upcoming Meetings - OBEAG',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #8B4513; text-align: center;">Monthly Association Update</h2>
              <p>Dear ${user.name},</p>
              
              <h3 style="color: #8B4513; border-bottom: 2px solid #8B4513; padding-bottom: 5px;">1. Outstanding Dues</h3>
              <p>Here are your current outstanding dues. Please clear these by sending payment to the association's bank account and submitting verification requests on the dashboard:</p>
              ${duesHtml}
              
              <h3 style="color: #8B4513; border-bottom: 2px solid #8B4513; padding-bottom: 5px; margin-top: 30px;">2. Upcoming Meetings</h3>
              <p>Please note the schedule for our upcoming meetings:</p>
              ${meetingsHtml}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}" style="background-color: #8B4513; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
              </div>
              
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">OBEAG Admin Automated System</p>
            </div>
          `
        });
        emailsSent++;
      }
    }

    return NextResponse.json({ message: 'Reminders sent successfully', count: emailsSent });

  } catch (error) {
    console.error('Reminder sending error:', error);
    return NextResponse.json({ error: 'Failed to send reminders' }, { status: 500 });
  }
}