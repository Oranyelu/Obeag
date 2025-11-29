import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const dues = await prisma.due.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(dues);
  } catch (error) {
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