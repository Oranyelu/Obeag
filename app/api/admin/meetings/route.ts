import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { date: 'asc' },
    });
    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json({ error: 'Failed to fetch meetings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, date, location } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Title and Date are required' }, { status: 400 });
    }

    const meetingDate = new Date(date);
    if (isNaN(meetingDate.getTime())) {
      return NextResponse.json({ error: 'Invalid meeting date' }, { status: 400 });
    }

    const newMeeting = await prisma.meeting.create({
      data: {
        title,
        description: description || null,
        date: meetingDate,
        location: location || null,
      },
    });

    return NextResponse.json(newMeeting, { status: 201 });
  } catch (error) {
    console.error('Create meeting error:', error);
    return NextResponse.json({ error: 'Failed to create meeting' }, { status: 500 });
  }
}
