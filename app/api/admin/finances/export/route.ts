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

    // 1. Fetch completed payments (income)
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

    // 2. Fetch expenses
    const expenses = await prisma.expense.findMany();

    // 3. Compile unified ledger items
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
        title: p.due.title,
        description: p.user.name,
        email: p.user.email,
        amount: p.amount,
      });
      totalIncome += p.amount;
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

    // 4. Generate CSV string
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

    // 5. Generate filename with date
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
