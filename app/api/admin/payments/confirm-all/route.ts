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

    // 1. Fetch all pending payments
    const pendingPayments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      include: {
        user: true,
        due: true,
      },
    });

    if (pendingPayments.length === 0) {
      return NextResponse.json({ success: true, message: 'No pending payments to confirm', count: 0 });
    }

    const paymentIds = pendingPayments.map((p) => p.id);

    // 2. Update all pending payments to COMPLETED in the database
    await prisma.payment.updateMany({
      where: { id: { in: paymentIds } },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // 3. Send confirmation emails to each member asynchronously (in parallel)
    const emailPromises = pendingPayments.map(async (payment) => {
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
        console.error(`Failed to send bulk payment receipt email to ${payment.user.email} for payment ${payment.id}:`, emailErr);
      }
    });

    // Run emails without blocking the main database update success, but wait for all to complete execution logs
    await Promise.allSettled(emailPromises);

    return NextResponse.json({
      success: true,
      message: `Successfully confirmed ${pendingPayments.length} payments`,
      count: pendingPayments.length,
    });
  } catch (error) {
    console.error('Error confirming all payments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
