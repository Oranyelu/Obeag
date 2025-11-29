import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST() {
  try {
    const code = randomBytes(4).toString('hex').toUpperCase();
    
    const newCode = await prisma.verificationCode.create({
      data: {
        code,
      },
    });

    return NextResponse.json(newCode);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}