import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendEmail } from '@/app/lib/email';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, dueId } = body;

    if (!userId || !dueId) {
      return NextResponse.json({ error: 'Missing userId or dueId' }, { status: 400 });
    }

    // 1. Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Verify due exists
    const due = await prisma.due.findUnique({
      where: { id: dueId },
    });
    if (!due) {
      return NextResponse.json({ error: 'Due not found' }, { status: 404 });
    }

    // 3. Check for existing payment
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        dueId,
      },
    });

    if (existingPayment) {
      if (existingPayment.status === 'COMPLETED') {
        return NextResponse.json({ error: 'This due has already been marked as paid for this user' }, { status: 400 });
      }

      // If existing payment is PENDING or FAILED, update it to COMPLETED
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
          amount: due.amount, // Reconcile amount
        },
      });
    } else {
      // Create a brand new completed payment record
      await prisma.payment.create({
        data: {
          userId,
          dueId,
          amount: due.amount,
          status: 'COMPLETED',
          paidAt: new Date(),
          submittedAt: new Date(),
        },
      });
    }

    // 4. Send email notification to user
    try {
      await sendEmail({
        to: user.email,
        subject: `Due Reconciled & Confirmed: ${due.title} - OBEAG`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
            <h2 style="color: #2e7d32; text-align: center;">Due Marked as Paid</h2>
            <p>Dear ${user.name},</p>
            <p>We are writing to notify you that the administrator has manually marked your due <strong>${due.title}</strong> as paid in the association records.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2e7d32;">
              <p style="margin: 5px 0;"><strong>Due Item:</strong> ${due.title}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ₦${due.amount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Date Confirmed:</strong> ${new Date().toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> COMPLETED (Manually Reconciled)</p>
            </div>
            <p>This has been reconciled and is now reflected on your dashboard. Thank you for your contribution.</p>
            <hr style="border: 1px solid #eee;" />
            <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send reconciliation confirmation email:', emailErr);
    }

    return NextResponse.json({ success: true, message: 'Due marked as paid successfully' });
  } catch (error) {
    console.error('Error marking due as paid:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
