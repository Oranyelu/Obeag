import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendEmail } from '@/app/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
    }

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true },
    });

    // 1. Create DB notifications
    await prisma.$transaction(
      users.map((user) =>
        prisma.notification.create({
          data: {
            title,
            message,
            userId: user.id,
          },
        })
      )
    );

    // 2. Send Emails
    console.log(`Sending broadcast emails to ${users.length} users...`);
    const emailPromises = users.map(user => 
        sendEmail({
            to: user.email,
            subject: `OBEAG Broadcast: ${title}`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #333;">
                    <h1 style="color: #8B4513;">${title}</h1>
                    <p>Dear ${user.name || 'Member'},</p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                    <br/>
                    <hr style="border: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #888;">Best regards,<br/>OBEAG Admin</p>
                </div>
            `
        })
    );

    await Promise.allSettled(emailPromises);

    return NextResponse.json({ message: 'Broadcast sent successfully' }, { status: 201 });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}