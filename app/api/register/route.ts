import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, code } = body;

    if (!email || !password || !code) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify code
    const verificationCode = await prisma.verificationCode.findUnique({
      where: { code },
    });

    if (!verificationCode) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    if (verificationCode.isUsed) {
      return NextResponse.json({ error: 'Code already used' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user and update code
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      await tx.verificationCode.update({
        where: { id: verificationCode.id },
        data: {
          isUsed: true,
          usedByUserId: newUser.id,
        },
      });

      return newUser;
    });

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}