import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
        flaggedReason: user.flaggedReason,
        flaggedAt: user.flaggedAt ? user.flaggedAt.toISOString() : null,
        pendingProfilePicture: user.pendingProfilePicture,
        pendingBirthCert: user.pendingBirthCert,
        pendingMediaStatus: user.pendingMediaStatus,
        pendingMediaSubmittedAt: user.pendingMediaSubmittedAt ? user.pendingMediaSubmittedAt.toISOString() : null,
        createdAt: user.createdAt.toISOString(),
        financials: {
          walletBalance: user.walletBalance,
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

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, codeId, newName } = body;

    if (!newName || typeof newName !== 'string' || newName.trim() === '') {
      return NextResponse.json({ error: 'A valid name is required.' }, { status: 400 });
    }

    const trimmedName = newName.trim();

    // 1. If updating an unactivated verification code
    if (codeId || (userId && typeof userId === 'string' && userId.startsWith('code-'))) {
      const cleanCodeId = codeId || userId.replace('code-', '');
      const existingCode = await prisma.verificationCode.findUnique({
        where: { id: cleanCodeId },
      });

      if (!existingCode) {
        return NextResponse.json({ error: 'Registration code record not found.' }, { status: 404 });
      }

      // Check if duplicate name exists among active users or other unused codes
      let duplicateExists = false;
      try {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            name: { equals: trimmedName, mode: 'insensitive' },
            status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
          },
        });

        const duplicateCode = await prisma.verificationCode.findFirst({
          where: {
            id: { not: cleanCodeId },
            name: { equals: trimmedName, mode: 'insensitive' },
            isUsed: false,
          },
        });

        if (duplicateUser || duplicateCode) {
          duplicateExists = true;
        }
      } catch {
        // In case mode: 'insensitive' is not supported by driver
        const users = await prisma.user.findMany({
          where: { status: { in: ['APPROVED', 'PENDING_APPROVAL'] } },
          select: { name: true },
        });
        const codes = await prisma.verificationCode.findMany({
          where: { isUsed: false, id: { not: cleanCodeId } },
          select: { name: true },
        });
        const lowerName = trimmedName.toLowerCase();
        if (users.some((u) => u.name.toLowerCase() === lowerName) || codes.some((c) => c.name.toLowerCase() === lowerName)) {
          duplicateExists = true;
        }
      }

      if (duplicateExists) {
        return NextResponse.json(
          { error: 'Another member with this name already exists in the system.' },
          { status: 400 }
        );
      }

      const updatedCode = await prisma.verificationCode.update({
        where: { id: cleanCodeId },
        data: { name: trimmedName },
      });

      return NextResponse.json({
        success: true,
        message: 'Pre-registered member name updated successfully.',
        code: updatedCode,
      });
    }

    // 2. If updating a registered user
    if (userId) {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { verificationCode: true },
      });

      if (!existingUser) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
      }

      // Check if duplicate name exists with a different user or unused code
      let duplicateExists = false;
      try {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            id: { not: userId },
            name: { equals: trimmedName, mode: 'insensitive' },
            status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
          },
        });

        const duplicateCode = await prisma.verificationCode.findFirst({
          where: {
            name: { equals: trimmedName, mode: 'insensitive' },
            isUsed: false,
          },
        });

        if (duplicateUser || duplicateCode) {
          duplicateExists = true;
        }
      } catch {
        const users = await prisma.user.findMany({
          where: { id: { not: userId }, status: { in: ['APPROVED', 'PENDING_APPROVAL'] } },
          select: { name: true },
        });
        const codes = await prisma.verificationCode.findMany({
          where: { isUsed: false },
          select: { name: true },
        });
        const lowerName = trimmedName.toLowerCase();
        if (users.some((u) => u.name.toLowerCase() === lowerName) || codes.some((c) => c.name.toLowerCase() === lowerName)) {
          duplicateExists = true;
        }
      }

      if (duplicateExists) {
        return NextResponse.json(
          { error: 'Another member with this name already exists in the system.' },
          { status: 400 }
        );
      }

      // Update only the name - ensures all payments, ledger, dues, login credentials, and documents remain untouched
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name: trimmedName },
      });

      // If there's a linked verification code, keep its name in sync too
      if (existingUser.verificationCode) {
        await prisma.verificationCode.update({
          where: { id: existingUser.verificationCode.id },
          data: { name: trimmedName },
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Member name updated successfully.',
        user: { id: updatedUser.id, name: updatedUser.name },
      });
    }

    return NextResponse.json({ error: 'Missing userId or codeId.' }, { status: 400 });
  } catch (error) {
    console.error('Error updating member name:', error);
    return NextResponse.json({ error: 'Failed to update member name.' }, { status: 500 });
  }
}