import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import bcrypt from 'bcryptjs';

const VALID_COMMUNITIES = [
  'Ukehe Uwani',
  'Ukehe Uwenu',
  'Okpatu',
  'Umudo',
  'Umueze',
  'Obinagu',
  'Amachalla',
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        community: true,
        dob: true,
        status: true,
        role: true,
        googleId: true,
        profilePicture: true,
        birthCert: true,
        walletBalance: true,
        pendingProfilePicture: true,
        pendingBirthCert: true,
        pendingMediaStatus: true,
        pendingMediaSubmittedAt: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      community: user.community,
      dob: user.dob,
      status: user.status,
      role: user.role,
      googleId: user.googleId,
      profilePicture: user.profilePicture,
      birthCert: user.birthCert,
      walletBalance: user.walletBalance,
      pendingProfilePicture: user.pendingProfilePicture,
      pendingBirthCert: user.pendingBirthCert,
      pendingMediaStatus: user.pendingMediaStatus,
      pendingMediaSubmittedAt: user.pendingMediaSubmittedAt,
      hasPassword: Boolean(user.password),
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { phone, community, currentPassword, newPassword } = body;

    const dataToUpdate: any = {};

    // 1. Phone number update
    if (phone !== undefined) {
      if (typeof phone !== 'string' || phone.trim().length < 8) {
        return NextResponse.json({ error: 'Please enter a valid phone number (at least 8 digits)' }, { status: 400 });
      }
      dataToUpdate.phone = phone.trim();
    }

    // 2. Sub-community update
    if (community !== undefined) {
      if (!VALID_COMMUNITIES.includes(community)) {
        return NextResponse.json({ error: 'Please select a valid sub-community' }, { status: 400 });
      }
      dataToUpdate.community = community;
    }

    // 3. Password update
    if (newPassword) {
      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 });
      }

      // If user already has a password, verify current password
      if (user.password) {
        if (!currentPassword) {
          return NextResponse.json({ error: 'Please provide your current password to set a new password' }, { status: 400 });
        }
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
        }
      }

      dataToUpdate.password = await bcrypt.hash(newPassword, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No changes provided' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        community: true,
        status: true,
        role: true,
        googleId: true,
        profilePicture: true,
        birthCert: true,
        pendingProfilePicture: true,
        pendingBirthCert: true,
        pendingMediaStatus: true,
        pendingMediaSubmittedAt: true,
        password: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      user: {
        ...updatedUser,
        hasPassword: Boolean(updatedUser.password),
      },
    });
  } catch (error: any) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
