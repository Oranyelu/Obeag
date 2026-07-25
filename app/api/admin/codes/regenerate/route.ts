import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { codeId } = body;

    if (!codeId) {
      return NextResponse.json({ error: 'Code ID is required' }, { status: 400 });
    }

    const existingCode = await prisma.verificationCode.findUnique({
      where: { id: codeId },
    });

    if (!existingCode) {
      return NextResponse.json({ error: 'Verification code not found' }, { status: 404 });
    }

    if (existingCode.isUsed) {
      return NextResponse.json({ error: 'Cannot regenerate a code that has already been used' }, { status: 400 });
    }

    // Generate new 6-character uppercase alphanumeric code
    const newCodeString = crypto.randomBytes(3).toString('hex').toUpperCase();

    const updated = await prisma.verificationCode.update({
      where: { id: codeId },
      data: {
        code: newCodeString,
        createdAt: new Date(), // Reset creation date
      },
    });

    return NextResponse.json({ success: true, code: updated });
  } catch (error) {
    console.error('Error regenerating code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
