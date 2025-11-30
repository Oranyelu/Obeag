import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all completed payments with Due info (including original amount)
    const payments = await prisma.payment.findMany({
      where: { status: 'COMPLETED' },
      include: {
        due: {
          select: { 
            type: true,
            amount: true // Needed to calculate penalty portion
          }
        }
      }
    });

    // 2. Fetch all expenses
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });

    // 3. Aggregate Income by Type (splitting Penalties)
    const incomeByGroup: Record<string, number> = {};
    let totalIncome = 0;

    payments.forEach(payment => {
      const type = payment.due.type || 'Other';
      const paidAmount = payment.amount;
      const originalAmount = payment.due.amount;

      // Check if this payment includes a penalty (paid > original)
      if (paidAmount > originalAmount) {
        const penaltyPortion = paidAmount - originalAmount;
        const basePortion = originalAmount;

        // Add base portion to the original type
        incomeByGroup[type] = (incomeByGroup[type] || 0) + basePortion;
        
        // Add penalty portion to "Penalty" category
        incomeByGroup['Penalty'] = (incomeByGroup['Penalty'] || 0) + penaltyPortion;
      } else {
        // Regular payment
        incomeByGroup[type] = (incomeByGroup[type] || 0) + paidAmount;
      }

      totalIncome += paidAmount;
    });

    // 4. Calculate Totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      netBalance,
      incomeByGroup,
      expenses
    });

  } catch (error) {
    console.error('Finances API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch finances' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, amount, description, date } = body;

    if (!title || !amount) {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        amount: parseFloat(amount),
        description,
        date: date ? new Date(date) : new Date(),
      }
    });

    return NextResponse.json(expense, { status: 201 });

  } catch (error) {
    console.error('Create Expense Error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}