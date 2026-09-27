import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/app/lib/prisma';
import { Navbar } from '@/app/components/Navbar';
import { Footer } from '@/app/components/Footer';
import { BottomNavbar } from '@/app/components/BottomNavbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  let unreadCount = 0;

  if (session?.user?.id) {
    unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-200">
      <Navbar unreadCount={unreadCount} />

      <main className="flex-grow pt-3 pb-24 sm:py-5 w-full">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          {children}
        </div>
      </main>

      <Footer />
      <BottomNavbar unreadCount={unreadCount} />
    </div>
  );
}