import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendEmail } from '@/app/lib/email';
import { deleteStorageFile } from '@/app/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, action, feedback } = body; // action: 'APPROVE' | 'REJECT'

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json({ error: 'Invalid action. Must be APPROVE or REJECT' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.pendingMediaStatus || user.pendingMediaStatus !== 'PENDING') {
      return NextResponse.json({ error: 'No pending document updates found for this user' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      const oldProfilePic = user.profilePicture;
      const oldBirthCert = user.birthCert;

      const newProfilePic = user.pendingProfilePicture || user.profilePicture;
      const newBirthCert = user.pendingBirthCert || user.birthCert;

      // 1. Update user record with the new pictures and clear pending fields
      await prisma.user.update({
        where: { id: userId },
        data: {
          profilePicture: newProfilePic,
          birthCert: newBirthCert,
          pendingProfilePicture: null,
          pendingBirthCert: null,
          pendingMediaStatus: null,
          pendingMediaSubmittedAt: null,
        },
      });

      // 2. Once approved, safely remove the old pictures from Supabase Storage
      if (user.pendingProfilePicture && oldProfilePic && oldProfilePic !== newProfilePic) {
        await deleteStorageFile(oldProfilePic);
      }
      if (user.pendingBirthCert && oldBirthCert && oldBirthCert !== newBirthCert) {
        await deleteStorageFile(oldBirthCert);
      }

      // 3. Create user in-app notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Document Update Approved',
          message: 'Your request to update your profile photo and/or birth certificate has been approved by the administrator and is now live.',
        },
      });

      // 4. Send email notification to user
      try {
        await sendEmail({
          to: user.email,
          subject: 'Document Update Approved - OBEAG App',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #2e7d32; text-align: center;">Document Update Approved!</h2>
              <p>Dear ${user.name},</p>
              <p>Your requested update for your profile photo and/or birth certificate has been reviewed and **approved** by the administrator.</p>
              <p>The updated documents are now active on your profile.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/" style="background-color: #8B4513; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
              </div>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send media approval email:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Document update approved successfully. Old media replaced in storage.',
      });
    }

    if (action === 'REJECT') {
      const unapprovedProfilePic = user.pendingProfilePicture;
      const unapprovedBirthCert = user.pendingBirthCert;

      // 1. Delete the unapproved files from Supabase Storage so orphaned files don't linger
      if (unapprovedProfilePic) {
        await deleteStorageFile(unapprovedProfilePic);
      }
      if (unapprovedBirthCert) {
        await deleteStorageFile(unapprovedBirthCert);
      }

      // 2. Clear pending fields without touching active pictures
      await prisma.user.update({
        where: { id: userId },
        data: {
          pendingProfilePicture: null,
          pendingBirthCert: null,
          pendingMediaStatus: null,
          pendingMediaSubmittedAt: null,
        },
      });

      // 3. Create user in-app notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'Document Update Declined',
          message: feedback 
            ? `Your document update request was declined: ${feedback}. Your current documents remain active.`
            : 'Your document update request was declined by the administrator. Your current documents remain active.',
        },
      });

      // 4. Send email notification to user
      try {
        await sendEmail({
          to: user.email,
          subject: 'Document Update Declined - OBEAG App',
          html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
              <h2 style="color: #c62828; text-align: center;">Document Update Declined</h2>
              <p>Dear ${user.name},</p>
              <p>Your request to update your profile photo and/or birth certificate was declined by the administrator.</p>
              ${feedback ? `<p><strong>Reason:</strong> ${feedback}</p>` : ''}
              <p>Your previous documents remain in place and your account remains in good standing.</p>
              <hr style="border: 1px solid #eee;" />
              <p style="font-size: 12px; color: #888; text-align: center;">Best regards,<br/>OBEAG Admin</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send media rejection email:', emailErr);
      }

      return NextResponse.json({
        success: true,
        message: 'Document update rejected. Pending media removed from storage.',
      });
    }

  } catch (error: any) {
    console.error('Media approval error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process media approval' 
    }, { status: 500 });
  }
}
