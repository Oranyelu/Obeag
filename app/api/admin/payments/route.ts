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

    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        },
        due: {
          select: {
            title: true,
            amount: true,
            type: true,
          }
        }
      },
      orderBy: { submittedAt: 'desc' },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
