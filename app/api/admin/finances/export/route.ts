import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return new Response('Unauthorized', { status: 401 });
    }

    // 1. Fetch completed payments (income from member dues)
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        },
        due: {
          select: {
            title: true,
            type: true,
          }
        }
      }
    });

    // 2. Fetch direct incomes/deposits (gifts, donations, grants, etc.)
    const incomes = await prisma.income.findMany();

    // 3. Fetch expenses
    const expenses = await prisma.expense.findMany();

    // 4. Compile unified ledger items
    const ledgerItems: Array<{
      date: Date;
      type: 'Income' | 'Expense';
      title: string;
      description: string;
      email: string;
      amount: number;
    }> = [];

    let totalIncome = 0;
    let totalExpenses = 0;

    payments.forEach(p => {
      ledgerItems.push({
        date: p.paidAt || p.submittedAt || new Date(),
        type: 'Income',
        title: `${p.due.title} (${p.due.type})`,
        description: `Member: ${p.user.name}`,
        email: p.user.email,
        amount: p.amount,
      });
      totalIncome += p.amount;
    });

    incomes.forEach(inc => {
      const donorDetail = inc.donor ? `Donor: ${inc.donor}` : 'External Deposit/Gift';
      const notes = inc.description ? ` (${inc.description})` : '';
      ledgerItems.push({
        date: inc.date,
        type: 'Income',
        title: `${inc.title} [${inc.category || 'Donation'}]`,
        description: `${donorDetail}${notes}`,
        email: '',
        amount: inc.amount,
      });
      totalIncome += inc.amount;
    });

    expenses.forEach(e => {
      ledgerItems.push({
        date: e.date,
        type: 'Expense',
        title: e.title,
        description: e.description || '',
        email: '',
        amount: -e.amount,
      });
      totalExpenses += e.amount;
    });

    // Sort chronologically descending (newest first)
    ledgerItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    // 5. Generate CSV string
    let csvContent = 'Date,Transaction Type,Title/Category,Member/Description,Email,Amount (Naira)\n';
    
    const escapeCsv = (str: string) => {
      const sanitized = str.replace(/"/g, '""');
      return sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')
        ? `"${sanitized}"`
        : sanitized;
    };

    ledgerItems.forEach(item => {
      const formattedDate = item.date.toISOString().split('T')[0];
      csvContent += `${formattedDate},${item.type},${escapeCsv(item.title)},${escapeCsv(item.description)},${escapeCsv(item.email)},${item.amount}\n`;
    });

    // Append Summary
    csvContent += '\n';
    csvContent += `,,,Total Income,,${totalIncome}\n`;
    csvContent += `,,,Total Expenses,,-${totalExpenses}\n`;
    csvContent += `,,,Net Balance,,${totalIncome - totalExpenses}\n`;

    // 6. Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `OBEAG_Financial_Ledger_${dateStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Failed to export financial records:', error);
    return new Response('Failed to export financial records', { status: 500 });
  }
}
