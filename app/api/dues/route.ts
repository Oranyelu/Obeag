import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendEmail } from '@/app/lib/email';

export async function GET() {
  try {
    // Lazy Generation of Monthly Dues
    const now = new Date();
    const shortMonth = now.toLocaleString('en-US', { month: 'short' });
    const longMonth = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear();
    const shortTitle = `Monthly Due - ${shortMonth} ${year}`;
    const longTitle = `Monthly Due - ${longMonth} ${year}`;

    // Check if a monthly due for this month and year already exists (by title or date range)
    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);

    const existingDue = await prisma.due.findFirst({
      where: {
        type: 'MONTHLY',
        OR: [
          { title: shortTitle },
          { title: longTitle },
          {
            dueDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        ],
      },
    });

    if (!existingDue) {
      console.log(`Creating automatic due: ${shortTitle}`);
      await prisma.due.create({
        data: {
          title: shortTitle,
          description: `Automatic monthly due for ${shortMonth} ${year}`,
          amount: 200,
          type: 'MONTHLY',
          dueDate: new Date(year, now.getMonth() + 1, 0), // Last day of month
        },
      });
    }

    const dues = await prisma.due.findMany({
      include: {
        payments: {
          where: { status: 'COMPLETED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const mappedDues = dues.map((due) => {
      const completedPayments = due.payments || [];
      const totalCollected = completedPayments.reduce((sum, p) => sum + p.amount, 0);

      const contributorMap = new Map<string, { id: string; name: string; email: string; amount: number }>();
      for (const p of completedPayments) {
        const existing = contributorMap.get(p.userId) || {
          id: p.userId,
          name: p.user?.name || 'Unknown Member',
          email: p.user?.email || '',
          amount: 0,
        };
        existing.amount += p.amount;
        contributorMap.set(p.userId, existing);
      }

      return {
        id: due.id,
        title: due.title,
        description: due.description,
        amount: due.amount,
        type: due.type,
        dueDate: due.dueDate.toISOString(),
        createdAt: due.createdAt.toISOString(),
        updatedAt: due.updatedAt?.toISOString() || due.createdAt.toISOString(),
        contributorsCount: contributorMap.size,
        totalCollected,
        contributors: Array.from(contributorMap.values()),
      };
    });

    return NextResponse.json(mappedDues);
  } catch (error) {
    console.error('Failed to fetch dues:', error);
    return NextResponse.json({ error: 'Failed to fetch dues' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, amount, type, dueDate } = body;

    if (!title || !amount || !dueDate) {
      return NextResponse.json({ error: 'Title, amount, and due date are required' }, { status: 400 });
    }

    const due = await prisma.due.create({
      data: {
        title,
        description,
        amount: parseFloat(amount),
        type,
        dueDate: new Date(dueDate),
      },
    });

    return NextResponse.json(due, { status: 201 });
  } catch (error) {
    console.error('Failed to create due:', error);
    return NextResponse.json({ error: 'Failed to create due' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    let dueId: string | null = null;
    try {
      const body = await request.json();
      dueId = body?.dueId || body?.id;
    } catch {
      // Body might be empty if sent as query parameter
    }

    if (!dueId) {
      const { searchParams } = new URL(request.url);
      dueId = searchParams.get('id') || searchParams.get('dueId');
    }

    if (!dueId) {
      return NextResponse.json({ error: 'Due ID is required' }, { status: 400 });
    }

    const due = await prisma.due.findUnique({
      where: { id: dueId },
      include: {
        payments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                walletBalance: true,
              },
            },
          },
        },
      },
    });

    if (!due) {
      return NextResponse.json({ error: 'Due item not found' }, { status: 404 });
    }

    // Filter completed payments that actually contributed money
    const completedPayments = due.payments.filter((p) => p.status === 'COMPLETED' && p.amount > 0);

    // Group contributors and sum their total contributions to this due
    const contributorMap = new Map<string, {
      user: { id: string; name: string; email: string; walletBalance: number };
      totalPaid: number;
    }>();

    for (const p of completedPayments) {
      if (p.user) {
        const existing = contributorMap.get(p.userId) || {
          user: p.user,
          totalPaid: 0,
        };
        existing.totalPaid += p.amount;
        contributorMap.set(p.userId, existing);
      }
    }

    const totalRefundedAmount = Array.from(contributorMap.values()).reduce(
      (sum, item) => sum + item.totalPaid,
      0
    );

    const refundSummary: Array<{
      userId: string;
      userName: string;
      email: string;
      refundedAmount: number;
      newWalletBalance: number;
    }> = [];

    // Execute atomic transaction: refund wallets, notify, delete payment records, delete due
    await prisma.$transaction(async (tx) => {
      // 1. Credit wallet for each contributor
      for (const [userId, item] of contributorMap.entries()) {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            walletBalance: {
              increment: item.totalPaid,
            },
          },
        });

        refundSummary.push({
          userId,
          userName: item.user.name,
          email: item.user.email,
          refundedAmount: item.totalPaid,
          newWalletBalance: updatedUser.walletBalance,
        });

        // Create in-app notification
        await tx.notification.create({
          data: {
            userId,
            title: 'Due Cancelled - Wallet Credited',
            message: `The due "${due.title}" has been removed by the administration. Your contributed amount of ₦${item.totalPaid.toLocaleString()} has been credited to your personal wallet. Current Wallet Balance: ₦${updatedUser.walletBalance.toLocaleString()}.`,
          },
        });
      }

      // 2. Notify users who had a pending payment submission for this due
      const pendingPayments = due.payments.filter((p) => p.status === 'PENDING');
      for (const p of pendingPayments) {
        if (!contributorMap.has(p.userId)) {
          await tx.notification.create({
            data: {
              userId: p.userId,
              title: 'Due Request Cancelled',
              message: `The due "${due.title}" for which you had a pending payment request of ₦${p.amount.toLocaleString()} has been cancelled and removed.`,
            },
          });
        }
      }

      // 3. Delete all payment records associated with this due
      await tx.payment.deleteMany({
        where: { dueId: due.id },
      });

      // 4. Delete the due itself
      await tx.due.delete({
        where: { id: due.id },
      });
    });

    // Send emails in background (non-blocking)
    for (const item of refundSummary) {
      try {
        await sendEmail({
          to: item.email,
          subject: `Due Cancelled & ₦${item.refundedAmount.toLocaleString()} Credited to Wallet - OBEAG`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #2d221a; max-width: 600px; margin: 0 auto; border: 1px solid #e8ded4; padding: 24px; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #8b4513; margin-top: 0;">Due Cancelled & Wallet Credited</h2>
              <p>Dear <strong>${item.userName}</strong>,</p>
              <p>The association administrator has cancelled and removed the following due item:</p>
              
              <div style="background-color: #fcf9f5; border: 1px solid #e8ded4; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 4px 0;"><strong>Cancelled Due:</strong> ${due.title}</p>
                <p style="margin: 4px 0;"><strong>Due Amount:</strong> ₦${due.amount.toLocaleString()}</p>
                <p style="margin: 4px 0;"><strong>Your Contributed Amount:</strong> ₦${item.refundedAmount.toLocaleString()}</p>
              </div>

              <div style="background-color: #f4ebe1; border-left: 4px solid #8b4513; padding: 14px; border-radius: 6px; margin: 16px 0;">
                <p style="margin: 0; font-weight: bold; color: #8b4513;">
                  ₦${item.refundedAmount.toLocaleString()} has been credited into your personal wallet.
                </p>
                <p style="margin: 6px 0 0 0; font-size: 13px; color: #7c685b;">
                  Your updated wallet balance is <strong>₦${item.newWalletBalance.toLocaleString()}</strong>. This balance can be used to offset upcoming dues, or viewed anytime on your dashboard.
                </p>
              </div>

              <p style="font-size: 13px; color: #7c685b; margin-top: 24px;">Thank you for your active commitment to OBEAG.</p>
              <hr style="border: none; border-top: 1px solid #e8ded4; margin: 20px 0;" />
              <p style="font-size: 12px; color: #a69588; text-align: center;">OBEAG Executive Committee</p>
            </div>
          `,
        });
      } catch (err) {
        console.error(`Failed to send refund notification email to ${item.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Due "${due.title}" successfully deleted. ${refundSummary.length} contributor(s) had their excess payments totaling ₦${totalRefundedAmount.toLocaleString()} credited to their wallet.`,
      deletedDue: { id: due.id, title: due.title, amount: due.amount },
      contributorsRefundedCount: refundSummary.length,
      totalRefundedAmount,
      refundSummary,
    });
  } catch (error) {
    console.error('Failed to delete due:', error);
    return NextResponse.json({ error: 'Failed to delete due' }, { status: 500 });
  }
}