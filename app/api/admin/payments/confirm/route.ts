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
    const { paymentId, action } = body; // Action: 'CONFIRM' or 'DECLINE'

    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing paymentId or action' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
        due: true,
      }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (action === 'CONFIRM') {
      // Update Payment to COMPLETED
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
        }
      });

      // Send Confirmation Receipt to Member
      try {
        await sendEmail({
          to: payment.user.email,
          subject: `Payment Confirmed: ${payment.due.title} - OBEAG`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #2e7d32; text-align: center;">Payment Confirmed</h2>
              <p>Dear ${payment.user.name},</p>
              <p>We are writing to confirm that the administrator has verified and approved your payment request.</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2e7d32;">
                <p style="margin: 5px 0;"><strong>Due:</strong> ${payment.due.title}</p>
                <p style="margin: 5px 0;"><strong>Amount Paid:</strong> ${payment.amount.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Date Confirmed:</strong> ${new Date().toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> COMPLETED</p>
              </div>
              <p>This due is now marked as **Paid** on your dashboard. Thank you for your prompt contribution.</p>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Failed to send payment receipt email:', emailErr);
      }

      return NextResponse.json({ success: true, message: 'Payment confirmed successfully' });
    }

    if (action === 'DECLINE') {
      // Update Payment to FAILED
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'FAILED',
          paidAt: null,
        }
      });

      // Send Decline Alert to Member
      try {
        await sendEmail({
          to: payment.user.email,
          subject: `Payment Declined: ${payment.due.title} - OBEAG`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #c62828; text-align: center;">Payment Request Declined</h2>
              <p>Dear ${payment.user.name},</p>
              <p>We regret to inform you that your payment confirmation request for <strong>${payment.due.title}</strong> was declined by the administrator.</p>
              <p>This could be because the transaction was not found in the association's bank records or the details did not match.</p>
              <p>Please double-check your bank transfer receipt and submit the payment confirmation request again on your dashboard.</p>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Failed to send payment decline email:', emailErr);
      }

      return NextResponse.json({ success: true, message: 'Payment request declined' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
