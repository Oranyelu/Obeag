import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    // Lazy Generation of Monthly Dues
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'long' });
    const year = now.getFullYear();
    const monthlyDueTitle = `Monthly Due - ${month} ${year}`;

    const existingDue = await prisma.due.findFirst({
      where: {
        title: monthlyDueTitle,
        type: 'MONTHLY',
      },
    });

    if (!existingDue) {
      console.log(`Creating automatic due: ${monthlyDueTitle}`);
      await prisma.due.create({
        data: {
          title: monthlyDueTitle,
          description: `Automatic monthly due for ${month} ${year}`,
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