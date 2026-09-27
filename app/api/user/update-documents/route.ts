import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { sendEmail } from '@/app/lib/email';
import { deleteStorageFile } from '@/app/lib/storage';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.status !== 'APPROVED') {
      return NextResponse.json({ 
        error: 'Only active, approved members can request document updates.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { profilePicture, birthCert } = body;

    if (!profilePicture && !birthCert) {
      return NextResponse.json({ 
        error: 'Please provide at least a new profile picture or a new birth certificate.' 
      }, { status: 400 });
    }

    // If there was an existing unapproved pending file being replaced by a newer one, clean it up
    if (profilePicture && user.pendingProfilePicture && user.pendingProfilePicture !== profilePicture) {
      await deleteStorageFile(user.pendingProfilePicture);
    }
    if (birthCert && user.pendingBirthCert && user.pendingBirthCert !== birthCert) {
      await deleteStorageFile(user.pendingBirthCert);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        pendingProfilePicture: profilePicture || user.pendingProfilePicture,
        pendingBirthCert: birthCert || user.pendingBirthCert,
        pendingMediaStatus: 'PENDING',
        pendingMediaSubmittedAt: new Date(),
      },
    });

    // Notify Admins about the pending document update
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, name: true },
      });

      if (admins.length > 0) {
        const itemsUpdated = [
          profilePicture ? 'Profile Picture' : null,
          birthCert ? 'Birth Certificate' : null,
        ].filter(Boolean).join(' and ');

        const emailPromises = admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: `Document Update Review: ${user.name} - OBEAG`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                <h2 style="color: #8B4513;">Member Document Update Requested</h2>
                <p>Dear ${admin.name || 'Admin'},</p>
                <p>Active member <strong>${user.name}</strong> (${user.email}) has submitted a request to update their <strong>${itemsUpdated}</strong>.</p>
                <p>Their current documents will remain unchanged until you inspect and approve this update on the admin panel.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/users" style="background-color: #8B4513; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Review Document Update</a>
                </div>
                <hr style="border: 1px solid #eee;" />
                <p style="font-size: 12px; color: #888;">OBEAG Automated Notification System</p>
              </div>
            `,
          })
        );

        await Promise.allSettled(emailPromises);
      }
    } catch (emailErr) {
      console.error('Failed to notify admins of document update:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Document update submitted successfully. Waiting for admin approval.',
      user: {
        pendingProfilePicture: updatedUser.pendingProfilePicture,
        pendingBirthCert: updatedUser.pendingBirthCert,
        pendingMediaStatus: updatedUser.pendingMediaStatus,
        pendingMediaSubmittedAt: updatedUser.pendingMediaSubmittedAt,
      },
    });

  } catch (error: any) {
    console.error('Document update error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to submit document update' 
    }, { status: 500 });
  }
}
