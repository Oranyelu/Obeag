import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { sendEmail } from '@/app/lib/email';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payments = await prisma.payment.findMany({
      where: { 
        userId: session.user.id,
        amount: { gt: 0 }
      },
      include: {
        due: {
          select: {
            title: true,
            type: true,
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
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

    // 1. Fetch dues
    const dues = await prisma.due.findMany({
      where: { id: { in: idsToPay } }
    });

    if (dues.length === 0) {
      return NextResponse.json({ error: 'Dues not found' }, { status: 404 });
    }

    // 2. Create pending payments in a transaction
    const newPayments = await prisma.$transaction(
      dues.map((due) => {
        return prisma.payment.create({
          data: {
            amount: due.amount, // Penalty feature removed as requested
            status: 'PENDING',
            userId: session.user.id,
            dueId: due.id,
            paidAt: null, // Null until admin confirms
          },
          include: {
            due: true
          }
        });
      })
    );

    // 3. Notify Admin(s) via email
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, name: true }
      });

      if (admins.length > 0) {
        const paymentListHtml = newPayments
          .map(p => `<li><strong>${p.due.title}</strong>: ${p.amount.toLocaleString()}</li>`)
          .join('');

        const emailPromises = admins.map(admin =>
          sendEmail({
            to: admin.email,
            subject: 'New Payment Verification Request - OBEAG',
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                <h2 style="color: #8B4513;">Payment Verification Required</h2>
                <p>Dear Admin (${admin.name || 'Admin'}),</p>
                <p>Member <strong>${session.user.name}</strong> (${session.user.email}) has submitted a manual payment confirmation request for the following dues:</p>
                <ul>
                  ${paymentListHtml}
                </ul>
                <p>The member claims to have sent the money to the age grade's bank account. Please verify your bank records and approve or decline the payment on the admin panel.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/payments" style="background-color: #8B4513; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Payments</a>
                </div>
                <hr style="border: 1px solid #eee;" />
                <p style="font-size: 12px; color: #888;">OBEAG Automated Notification System</p>
              </div>
            `
          })
        );

        await Promise.allSettled(emailPromises);
      }
    } catch (emailErr) {
      console.error('Failed to send admin payment notification email:', emailErr);
    }

    return NextResponse.json({ 
      message: 'Payment requests submitted successfully. Waiting for admin confirmation.', 
      count: newPayments.length 
    }, { status: 201 });

  } catch (error) {
    console.error('Payment request error:', error);
    return NextResponse.json({ error: 'Payment request submission failed' }, { status: 500 });
  }
}