import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true },
    });

    // Create notifications for all users
    // Note: createMany is not supported in SQLite for relations in the way we might want, 
    // but we can use a transaction or loop. 
    // Actually, createMany IS supported for simple models in SQLite but let's be safe with a transaction loop if needed.
    // Wait, createMany IS supported in Prisma with SQLite.
    
    // However, we need to link to userId.
    // Let's use a transaction to be safe and clear.
    
    await prisma.$transaction(
      users.map((user) =>
        prisma.notification.create({
          data: {
            title,
            message,
            userId: user.id,
          },
        })
      )
    );

    return NextResponse.json({ message: 'Broadcast sent successfully' }, { status: 201 });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}