import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendEmail } from '@/app/lib/email';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, action } = body; // Action: 'APPROVE' or 'REJECT'

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'APPROVED' },
      });

      // Send Email Notification to User
      try {
        await sendEmail({
          to: user.email,
          subject: 'Account Approved - OBEAG App',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #2e7d32; text-align: center;">Account Approved!</h2>
              <p>Dear ${user.name},</p>
              <p>Great news! Your registration request for the **OBEAG App** has been approved by the administrator.</p>
              <p>You can now log in to access all the features of the member dashboard, check your dues, and link your Google account for easier access.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/login" style="background-color: #8B4513; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login Now</a>
              </div>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send approval email:', emailErr);
      }

      return NextResponse.json({ success: true, message: 'User approved' });
    } 
    
    if (action === 'REJECT') {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'REJECTED' },
      });

      // Send Email Notification to User
      try {
        await sendEmail({
          to: user.email,
          subject: 'Account Registration Rejected - OBEAG App',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #c62828; text-align: center;">Registration Rejected</h2>
              <p>Dear ${user.name},</p>
              <p>We regret to inform you that your registration request for the **OBEAG App** could not be approved at this time.</p>
              <p>If you believe this was an error, or if you need to submit new documents (such as your birth certificate or baptismal card), please contact the association administrator directly.</p>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send rejection email:', emailErr);
      }

      return NextResponse.json({ success: true, message: 'User rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Approve user error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
