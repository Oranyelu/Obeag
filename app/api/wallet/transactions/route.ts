import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await prisma.walletTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { walletBalance: true },
    });

    return NextResponse.json({
      walletBalance: user?.walletBalance || 0,
      transactions,
    });

  } catch (error) {
    console.error('Fetch wallet transactions error:', error);
    return NextResponse.json({ error: 'Failed to fetch wallet transactions' }, { status: 500 });
  }
}
