import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'Google ID token is required' }, { status: 400 });
    }

    // Verify ID Token with Google's API
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    if (!googleRes.ok) {
      return NextResponse.json({ error: 'Failed to verify Google ID token' }, { status: 400 });
    }

    const payload = await googleRes.json();
    const googleId = payload.sub; // Unique Google identifier

    if (!googleId) {
      return NextResponse.json({ error: 'Invalid Google payload' }, { status: 400 });
    }

    // Check if this googleId is already linked to another user
    const existingLink = await prisma.user.findUnique({
      where: { googleId },
    });

    if (existingLink && existingLink.id !== session.user.id) {
      return NextResponse.json({ error: 'This Google account is already linked to another member.' }, { status: 400 });
    }

    // Link the googleId to the current user
    await prisma.user.update({
      where: { id: session.user.id },
      data: { googleId },
    });

    return NextResponse.json({ success: true, message: 'Google account linked successfully' });

  } catch (error) {
    console.error('Google linking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
