import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
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

    // 3. Fetch all direct incomes/deposits (gifts, donations, grants, etc.)
    const incomes = await prisma.income.findMany({
      orderBy: { date: 'desc' }
    });

    // 4. Aggregate Income by Type (splitting Penalties and adding Direct Incomes)
    const incomeByGroup: Record<string, number> = {};
    let duesIncome = 0;

    payments.forEach(payment => {
      const type = payment.due.type || 'Other Contributions';
      const paidAmount = payment.amount;
      const originalAmount = payment.due.amount;

      // Check if this payment includes a penalty (paid > original)
      if (paidAmount > originalAmount) {
        const penaltyPortion = paidAmount - originalAmount;
        const basePortion = originalAmount;

        // Add base portion to the original type
        incomeByGroup[type] = (incomeByGroup[type] || 0) + basePortion;
        
        // Add penalty portion to "Late Penalty" category
        incomeByGroup['Late Penalty'] = (incomeByGroup['Late Penalty'] || 0) + penaltyPortion;
      } else {
        // Regular payment
        incomeByGroup[type] = (incomeByGroup[type] || 0) + paidAmount;
      }

      duesIncome += paidAmount;
    });

    let directIncome = 0;
    incomes.forEach(income => {
      const categoryLabel = income.category ? income.category.trim() : 'Donations & Gifts';
      incomeByGroup[categoryLabel] = (incomeByGroup[categoryLabel] || 0) + income.amount;
      directIncome += income.amount;
    });

    // 5. Calculate Totals
    const totalIncome = duesIncome + directIncome;
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netBalance = totalIncome - totalExpenses;

    return NextResponse.json({
      totalIncome,
      duesIncome,
      directIncome,
      totalExpenses,
      netBalance,
      incomeByGroup,
      expenses,
      incomes
    });

  } catch (error) {
    console.error('Finances API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch finances' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, amount, description, date, category, donor } = body;

    if (!title || amount === undefined || amount === null || amount === '') {
      return NextResponse.json({ error: 'Title and amount are required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    const parsedDate = date ? new Date(date) : new Date();

    // Differentiate between INCOME (Deposit/Gift/Donation) and EXPENSE
    if (type === 'INCOME') {
      const income = await prisma.income.create({
        data: {
          title: title.trim(),
          amount: parsedAmount,
          category: category ? category.trim() : 'Donation',
          donor: donor ? donor.trim() : null,
          description: description ? description.trim() : null,
          date: parsedDate,
        }
      });

      return NextResponse.json({ message: 'Deposit / Income recorded successfully', item: income }, { status: 201 });
    }

    // Default to EXPENSE
    const expense = await prisma.expense.create({
      data: {
        title: title.trim(),
        amount: parsedAmount,
        description: description ? description.trim() : null,
        date: parsedDate,
      }
    });

    return NextResponse.json({ message: 'Expense recorded successfully', item: expense }, { status: 201 });

  } catch (error) {
    console.error('Create Finance Record Error:', error);
    return NextResponse.json({ error: 'Failed to record entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get('id');
    const queryType = searchParams.get('type');

    let id = queryId;
    let type = queryType;

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
        type = body.type;
      } catch {
        // Body was empty or invalid JSON
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Record ID is required' }, { status: 400 });
    }

    if (type === 'INCOME') {
      await prisma.income.delete({
        where: { id }
      });
      return NextResponse.json({ message: 'Deposit / Income deleted successfully' });
    }

    // Default to EXPENSE
    await prisma.expense.delete({
      where: { id }
    });
    return NextResponse.json({ message: 'Expense deleted successfully' });

  } catch (error) {
    console.error('Delete Finance Record Error:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}