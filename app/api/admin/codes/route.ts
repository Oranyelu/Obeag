import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import crypto from 'crypto';

export async function GET() {
  try {
    const codes = await prisma.verificationCode.findMany({
      include: {
        usedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(codes);
  } catch (error) {
    console.error('Fetch codes error:', error);
    return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Member name is required to generate a registration code' }, { status: 400 });
    }

    // Generate 6-character uppercase alphanumeric code (3 bytes hex is 6 chars)
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    const newCode = await prisma.verificationCode.create({
      data: {
        code,
        name: name.trim(),
      },
    });

    return NextResponse.json(newCode, { status: 201 });
  } catch (error) {
    console.error('Generate code error:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}