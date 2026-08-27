import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { sendEmail } from '@/app/lib/email';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, amount: rawAmount, action } = body; // action: 'DEPOSIT' or 'WITHDRAW'

    if (!userId || rawAmount === undefined || !action) {
      return NextResponse.json({ error: 'Missing userId, amount, or action' }, { status: 400 });
    }

    const amount = parseFloat(rawAmount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    if (action !== 'DEPOSIT' && action !== 'WITHDRAW') {
      return NextResponse.json({ error: 'Invalid action. Must be DEPOSIT or WITHDRAW' }, { status: 400 });
    }

    // 1. Fetch target user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'DEPOSIT') {
      const settledDues: Array<{ title: string; amount: number }> = [];
      let finalWalletBalance = 0;

      await prisma.$transaction(async (tx) => {
        // Add amount to user's wallet balance
        const initialWallet = user.walletBalance + amount;
        let currentWallet = initialWallet;

        // Fetch all dues in system
        const allDues = await tx.due.findMany({
          orderBy: { dueDate: 'asc' },
        });

        // Fetch user's payments
        const userPayments = await tx.payment.findMany({
          where: { userId },
        });

        // Find completed payments to exclude from outstanding
        const completedDueIds = new Set(
          userPayments.filter((p) => p.status === 'COMPLETED').map((p) => p.dueId)
        );

        // Filter outstanding dues
        const unpaidDues = allDues.filter((due) => !completedDueIds.has(due.id));

        // Distribute wallet balance to unpaid dues sequentially
        for (const due of unpaidDues) {
          if (currentWallet >= due.amount) {
            currentWallet -= due.amount;
            settledDues.push({ title: due.title, amount: due.amount });

            // Check if there is an existing payment (PENDING or FAILED) to update, otherwise create new
            const existingPayment = userPayments.find((p) => p.dueId === due.id);
            if (existingPayment) {
              await tx.payment.update({
                where: { id: existingPayment.id },
                data: {
                  status: 'COMPLETED',
                  paidAt: new Date(),
                  amount: due.amount,
                },
              });
            } else {
              await tx.payment.create({
                data: {
                  userId,
                  dueId: due.id,
                  amount: due.amount,
                  status: 'COMPLETED',
                  paidAt: new Date(),
                  submittedAt: new Date(),
                },
              });
            }
          } else {
            // Insufficient wallet balance for the next due in order. Stop distribution.
            break;
          }
        }

        // Update user's wallet balance
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { walletBalance: currentWallet },
        });
        finalWalletBalance = updatedUser.walletBalance;
      });

      // Send deposit confirmation email
      try {
        const settledDuesHtml = settledDues.length > 0
          ? `<p>The following dues were automatically settled from this payment:</p>
             <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
               <thead>
                 <tr style="background-color: #f2f2f2; text-align: left;">
                   <th style="padding: 8px; border: 1px solid #ddd;">Due Item</th>
                   <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Amount</th>
                 </tr>
               </thead>
               <tbody>
                 ${settledDues.map(d => `
                   <tr>
                     <td style="padding: 8px; border: 1px solid #ddd;">${d.title}</td>
                     <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₦${d.amount.toLocaleString()}</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>`
          : '<p>No outstanding dues were settled at this time.</p>';

        await sendEmail({
          to: user.email,
          subject: `Payment Received & Reconciled - OBEAG`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #2e7d32; text-align: center;">Payment Confirmed</h2>
              <p>Dear ${user.name},</p>
              <p>We are writing to confirm that the administrator has successfully deposited <strong>₦${amount.toLocaleString()}</strong> into your dues ledger.</p>
              
              ${settledDuesHtml}

              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2e7d32;">
                <p style="margin: 5px 0;"><strong>Deposited Amount:</strong> ₦${amount.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Dues Settled:</strong> ${settledDues.length} item(s)</p>
                <p style="margin: 5px 0;"><strong>Remaining Wallet Balance:</strong> ₦${finalWalletBalance.toLocaleString()}</p>
              </div>

              <p>This payment has been applied and is reflected on your dashboard. Thank you for your contribution.</p>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Failed to send bulk payment confirmation email:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully deposited ₦${amount.toLocaleString()} and settled ${settledDues.length} due(s).`,
        settledDues,
        walletBalance: finalWalletBalance,
      });
    }

    if (action === 'WITHDRAW') {
      // Fetch user's completed payments to check total assets (wallet + completed dues)
      const userPayments = await prisma.payment.findMany({
        where: { userId },
        include: { due: true }
      });
      const completedPayments = userPayments.filter(p => p.status === 'COMPLETED');
      const totalPaidAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalAssets = totalPaidAmount + user.walletBalance;

      if (amount > totalAssets) {
        return NextResponse.json({
          error: `Withdrawal amount (₦${amount.toLocaleString()}) exceeds the member's total assets/contributions (₦${totalAssets.toLocaleString()}).`
        }, { status: 400 });
      }

      const reversedDues: Array<{ title: string; amount: number }> = [];
      let finalWalletBalance = 0;

      await prisma.$transaction(async (tx) => {
        let remainingDeduction = amount;
        let currentWallet = user.walletBalance;

        // 1. Deduct from wallet first
        const walletDeduction = Math.min(currentWallet, remainingDeduction);
        currentWallet -= walletDeduction;
        remainingDeduction -= walletDeduction;

        // 2. Deduct from completed payment records (most recently paid first)
        if (remainingDeduction > 0) {
          // Sort payments by paidAt descending
          const sortedCompleted = completedPayments.sort((a, b) => {
            const timeA = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.submittedAt).getTime();
            const timeB = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.submittedAt).getTime();
            return timeB - timeA; // descending
          });

          for (const payment of sortedCompleted) {
            if (remainingDeduction <= 0) break;

            // Unpay the payment by setting its status to FAILED and clearing paidAt
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'FAILED',
                paidAt: null,
              }
            });

            reversedDues.push({ title: payment.due.title, amount: payment.amount });

            const retrieved = payment.amount;
            if (retrieved >= remainingDeduction) {
              const surplus = retrieved - remainingDeduction;
              currentWallet += surplus;
              remainingDeduction = 0;
            } else {
              remainingDeduction -= retrieved;
            }
          }
        }

        // Update user's wallet balance
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { walletBalance: currentWallet },
        });
        finalWalletBalance = updatedUser.walletBalance;
      });

      // Send withdrawal confirmation email
      try {
        const reversedDuesHtml = reversedDues.length > 0
          ? `<p>The following dues are now marked as <strong>Outstanding (Owing)</strong> again due to this transaction:</p>
             <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
               <thead>
                 <tr style="background-color: #f2f2f2; text-align: left;">
                   <th style="padding: 8px; border: 1px solid #ddd;">Due Item</th>
                   <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Amount</th>
                 </tr>
               </thead>
               <tbody>
                 ${reversedDues.map(d => `
                   <tr>
                     <td style="padding: 8px; border: 1px solid #ddd;">${d.title}</td>
                     <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₦${d.amount.toLocaleString()}</td>
                   </tr>
                 `).join('')}
               </tbody>
             </table>`
          : '<p>No previously completed dues were reversed during this transaction.</p>';

        await sendEmail({
          to: user.email,
          subject: `Payment Withdrawal / Ledger Adjustment Notice - OBEAG`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #c62828; text-align: center;">Ledger Adjustment</h2>
              <p>Dear ${user.name},</p>
              <p>This is to notify you that the administrator has processed a ledger adjustment / payment withdrawal of <strong>₦${amount.toLocaleString()}</strong> on your account.</p>
              
              ${reversedDuesHtml}

              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #c62828;">
                <p style="margin: 5px 0;"><strong>Withdrawn Amount:</strong> ₦${amount.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Dues Reopened:</strong> ${reversedDues.length} item(s)</p>
                <p style="margin: 5px 0;"><strong>New Wallet Balance:</strong> ₦${finalWalletBalance.toLocaleString()}</p>
              </div>

              <p>Please log in to your dashboard to review your outstanding dues. If you have questions, please contact the administrator.</p>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Failed to send bulk withdrawal confirmation email:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: `Successfully withdrew ₦${amount.toLocaleString()} and reversed ${reversedDues.length} due(s).`,
        reversedDues,
        walletBalance: finalWalletBalance,
      });
    }

  } catch (error) {
    console.error('Error handling admin bulk transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
