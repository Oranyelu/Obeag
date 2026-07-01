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

    // 1. Fetch all dues in the system
    const dues = await prisma.due.findMany({
      orderBy: { dueDate: 'asc' },
    });

    // 2. Fetch all users and their payment records
    const users = await prisma.user.findMany({
      include: {
        payments: {
          include: {
            due: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 3. Map users to compute their contributed and outstanding dues
    const mappedUsers = users.map((user) => {
      const duesContributed = user.payments.filter((p) => p.status === 'COMPLETED');
      const completedDueIds = new Set(duesContributed.map((p) => p.dueId));
      
      const duesOwing = dues.filter((due) => !completedDueIds.has(due.id));

      const totalContributed = duesContributed.reduce((sum, p) => sum + p.amount, 0);
      const totalOwing = duesOwing.reduce((sum, d) => sum + d.amount, 0);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        dob: user.dob.toISOString(),
        phone: user.phone,
        community: user.community,
        profilePicture: user.profilePicture,
        birthCert: user.birthCert,
        createdAt: user.createdAt.toISOString(),
        financials: {
          totalContributed,
          totalOwing,
          contributedList: duesContributed.map((p) => ({
            paymentId: p.id,
            dueId: p.dueId,
            title: p.due.title,
            amount: p.amount,
            paidAt: p.paidAt ? p.paidAt.toISOString() : null,
          })),
          owingList: duesOwing.map((d) => ({
            dueId: d.id,
            title: d.title,
            amount: d.amount,
            dueDate: d.dueDate.toISOString(),
            type: d.type,
            isPending: user.payments.some((p) => p.dueId === d.id && p.status === 'PENDING'),
          })),
        },
      };
    });

    return NextResponse.json(mappedUsers);
  } catch (error) {
    console.error('Error fetching admin users with financials:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}