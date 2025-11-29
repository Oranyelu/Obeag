'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      <aside className="w-full md:w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800">OBEAG Admin</h1>
        </div>
        <nav className="mt-6">
          <Link href="/admin/dues" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-500 hover:text-white">
            Manage Dues
          </Link>
          <Link href="/admin/users" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-500 hover:text-white">
            User Management
          </Link>
          <Link href="/admin/broadcast" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-blue-500 hover:text-white">
            Broadcasts
          </Link>
          <Link href="/" className="block py-2.5 px-4 rounded transition duration-200 hover:bg-gray-200 text-gray-600 mt-4">
            Back to Home
          </Link>
          <button
            onClick={() => signOut()}
            className="block w-full text-left py-2.5 px-4 rounded transition duration-200 hover:bg-red-500 hover:text-white text-red-600 mt-4"
          >
            Logout
          </button>
        </nav>
      </aside>
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}