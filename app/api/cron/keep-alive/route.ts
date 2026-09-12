import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// Ensure this route is never statically cached
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // If CRON_SECRET is configured in Vercel environment variables, verify it
    const authHeader = req.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ping Postgres database directly with a lightweight query to register activity on Supabase
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase database pinged successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Database ping failed';
    console.error('Keep-alive cron failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
