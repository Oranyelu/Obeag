import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    const cleanedCode = code.trim().toUpperCase();

    if (cleanedCode.length !== 6) {
      return NextResponse.json({ error: 'Code must be exactly 6 characters' }, { status: 400 });
    }

    const verification = await prisma.verificationCode.findUnique({
      where: { code: cleanedCode },
    });

    if (!verification) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 404 });
    }

    if (verification.isUsed) {
      return NextResponse.json({ error: 'This registration code has already been used' }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      name: verification.name 
    });
  } catch (error) {
    console.error('Verify code API error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
