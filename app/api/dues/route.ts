import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

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
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(dues);
  } catch (error) {
    console.error('Failed to fetch dues:', error);
    return NextResponse.json({ error: 'Failed to fetch dues' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, amount, type, dueDate } = body;

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
    return NextResponse.json({ error: 'Failed to create due' }, { status: 500 });
  }
}