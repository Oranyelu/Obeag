import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      code, 
      dob, 
      phone, 
      community, 
      profilePicture, 
      birthCert 
    } = body;

    // 1. Basic field presence checks
    if (!email || !password || !code || !dob || !phone || !community || !profilePicture || !birthCert) {
      return NextResponse.json({ error: 'Missing required profile fields' }, { status: 400 });
    }

    // 2. Validate Age Gate (Must be born between Jan 1, 1998 and Dec 31, 2002)
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      return NextResponse.json({ error: 'Invalid Date of Birth format' }, { status: 400 });
    }

    const minDate = new Date('1998-01-01T00:00:00.000Z');
    const maxDate = new Date('2002-12-31T23:59:59.999Z');

    if (dobDate < minDate || dobDate > maxDate) {
      return NextResponse.json({ 
        error: 'Registration restricted: You must be born between January 1, 1998 and December 31, 2002.' 
      }, { status: 400 });
    }

    // 3. Verify Code
    const cleanedCode = code.trim().toUpperCase();
    const verificationCode = await prisma.verificationCode.findUnique({
      where: { code: cleanedCode },
      include: { usedByUser: true }
    });

    if (!verificationCode) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 400 });
    }

    const codeUser = verificationCode.usedByUser;
    const isCodeUserRejected = codeUser?.status === 'REJECTED';

    if (verificationCode.isUsed && !isCodeUserRejected) {
      return NextResponse.json({ error: 'This verification code has already been used' }, { status: 400 });
    }

    // 4. Check if user already exists
    const emailUser = await prisma.user.findUnique({
      where: { email },
    });
    const isEmailUserRejected = emailUser?.status === 'REJECTED';

    if (emailUser && !isEmailUserRejected) {
      return NextResponse.json({ error: 'A user with this email address already exists' }, { status: 400 });
    }

    // 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Collect IDs of rejected users to delete
    const rejectedUserIds = new Set<string>();
    if (codeUser && isCodeUserRejected) rejectedUserIds.add(codeUser.id);
    if (emailUser && isEmailUserRejected) rejectedUserIds.add(emailUser.id);

    // 6. Create User and update Code in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Delete old rejected users and their associated records
      for (const rejectedId of rejectedUserIds) {
        // Delete payments
        await tx.payment.deleteMany({
          where: { userId: rejectedId }
        });
        // Delete notifications
        await tx.notification.deleteMany({
          where: { userId: rejectedId }
        });
        // Detach verification codes
        await tx.verificationCode.updateMany({
          where: { usedByUserId: rejectedId },
          data: {
            isUsed: false,
            usedByUserId: null
          }
        });
        // Delete user
        await tx.user.delete({
          where: { id: rejectedId }
        });
      }

      // Create a brand new user profile
      const registeredUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: verificationCode.name,
          role: 'USER',
          status: 'PENDING_APPROVAL',
          dob: dobDate,
          phone,
          community,
          profilePicture,
          birthCert,
        },
      });

      await tx.verificationCode.update({
        where: { id: verificationCode.id },
        data: {
          isUsed: true,
          usedByUserId: registeredUser.id,
        },
      });

      return registeredUser;
    });

    return NextResponse.json({ 
      message: 'Account registered successfully, pending admin approval.', 
      userId: result.id 
    }, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}