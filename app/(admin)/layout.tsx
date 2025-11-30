'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from '@/app/components/ThemeToggle';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300">
      <aside className="w-full md:w-64 bg-card shadow-md border-r border-border">
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">OBEAG Admin</h1>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          <Link href="/admin" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-primary-foreground font-medium">
            Dashboard
          </Link>
          <Link href="/admin/dues" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-primary-foreground">
            Manage Dues
          </Link>
          <Link href="/admin/users" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-primary-foreground">
            User Management
          </Link>
          <Link href="/admin/finances" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-primary-foreground">
            Finances
          </Link>
          <Link href="/admin/broadcast" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-primary-foreground">
            Broadcasts
          </Link>
          <Link href="/admin/reminders" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-primary hover:text-primary-foreground">
            Reminders
          </Link>
          
          <div className="pt-4 mt-4 border-t border-border">
            <Link href="/" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-muted text-muted-foreground">
              Back to Home
            </Link>
            <button
              onClick={() => signOut()}
              className="block w-full text-left py-2.5 px-4 rounded transition duration-200 hover:bg-red-600 hover:text-white text-red-500 mt-2"
            >
              Logout
            </button>
          </div>

          <div className="mt-8 hidden md:block px-4">
             <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <ThemeToggle />
                <span>Toggle Theme</span>
             </div>
          </div>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}