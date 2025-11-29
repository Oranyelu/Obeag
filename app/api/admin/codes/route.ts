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
    return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body; // Optional name for who the code is for

    const code = crypto.randomBytes(4).toString('hex').toUpperCase();

    const newCode = await prisma.verificationCode.create({
      data: {
        code,
        name,
      },
    });

    return NextResponse.json(newCode, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}