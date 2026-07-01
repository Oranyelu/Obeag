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

    const nameTrimmed = name.trim();

    // Check if name is already registered or has an unused registration code (case-insensitively)
    let exists = false;
    try {
      const existingUser = await prisma.user.findFirst({
        where: {
          name: { equals: nameTrimmed, mode: 'insensitive' },
          status: { in: ['APPROVED', 'PENDING_APPROVAL'] }
        }
      });
      const existingCode = await prisma.verificationCode.findFirst({
        where: {
          name: { equals: nameTrimmed, mode: 'insensitive' },
          isUsed: false
        }
      });
      if (existingUser || existingCode) {
        exists = true;
      }
    } catch (err) {
      // Fallback for SQLite in case mode: 'insensitive' is not supported
      const users = await prisma.user.findMany({
        where: { status: { in: ['APPROVED', 'PENDING_APPROVAL'] } },
        select: { name: true }
      });
      const codes = await prisma.verificationCode.findMany({
        where: { isUsed: false },
        select: { name: true }
      });
      const searchName = nameTrimmed.toLowerCase();
      const userDup = users.some(u => u.name.toLowerCase() === searchName);
      const codeDup = codes.some(c => c.name.toLowerCase() === searchName);
      if (userDup || codeDup) {
        exists = true;
      }
    }

    if (exists) {
      return NextResponse.json(
        { error: 'A member with this name is already registered or has a pending registration code.' },
        { status: 400 }
      );
    }

    // Generate 6-character uppercase alphanumeric code (3 bytes hex is 6 chars)
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    const newCode = await prisma.verificationCode.create({
      data: {
        code,
        name: nameTrimmed,
      },
    });

    return NextResponse.json(newCode, { status: 201 });
  } catch (error) {
    console.error('Generate code error:', error);
    return NextResponse.json({ error: 'Failed to generate code' }, { status: 500 });
  }
}