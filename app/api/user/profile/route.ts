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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        dob: true,
        community: true,
        status: true,
        role: true,
        googleId: true,
        profilePicture: true,
        birthCert: true,
        flaggedReason: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Fetch user profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status !== 'FLAGGED') {
      return NextResponse.json({ error: 'Profile is not flagged for correction' }, { status: 400 });
    }

    const body = await request.json();
    const { name, profilePicture, birthCert } = body;
    const dataToUpdate: any = {
      status: 'PENDING_APPROVAL',
      flaggedReason: null,
      flaggedAt: null,
    };

    // Only allow updating name if flagged for INCOMPLETE_NAME
    if (user.flaggedReason === 'INCOMPLETE_NAME') {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
      }
      
      const nameTrimmed = name.trim();

      // Check name duplication case-insensitively
      let isNameDuplicate = false;
      try {
        const existingUserWithName = await prisma.user.findFirst({
          where: {
            name: { equals: nameTrimmed, mode: 'insensitive' },
            status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
            id: { not: userId }
          }
        });
        if (existingUserWithName) isNameDuplicate = true;
      } catch (err) {
        // Fallback for SQLite
        const activeUsers = await prisma.user.findMany({
          where: {
            status: { in: ['APPROVED', 'PENDING_APPROVAL'] },
            id: { not: userId }
          },
          select: { name: true }
        });
        isNameDuplicate = activeUsers.some(
          u => u.name.toLowerCase() === nameTrimmed.toLowerCase()
        );
      }

      if (isNameDuplicate) {
        return NextResponse.json({ 
          error: 'A member with this name is already registered in the system.' 
        }, { status: 400 });
      }

      dataToUpdate.name = nameTrimmed;
    }

    // Allow updating profile picture if flagged for INVALID_PROFILE_PIC
    if (user.flaggedReason === 'INVALID_PROFILE_PIC') {
      if (!profilePicture || typeof profilePicture !== 'string') {
        return NextResponse.json({ error: 'Profile picture URL is required' }, { status: 400 });
      }
      dataToUpdate.profilePicture = profilePicture;
    }

    // Allow updating birth certificate if flagged for INVALID_BIRTH_CERT or DOCUMENT_MISMATCH
    if (user.flaggedReason === 'INVALID_BIRTH_CERT' || user.flaggedReason === 'DOCUMENT_MISMATCH') {
      if (!birthCert || typeof birthCert !== 'string') {
        return NextResponse.json({ error: 'Birth certificate URL is required' }, { status: 400 });
      }
      dataToUpdate.birthCert = birthCert;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
