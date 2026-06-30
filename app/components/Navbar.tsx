'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from './ThemeToggle';

interface NavbarProps {
    unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ unreadCount = 0 }) => {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path: string) => pathname === path;

    const navLinks = [
        { name: 'Dashboard', href: '/' },
        { name: 'History', href: '/history' },
        { name: 'Notifications', href: '/notifications' },
    ];

    return (
        <nav className="bg-card shadow-sm border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/">
                                <Image
                                    src="/logo.svg"
                                    alt="OBEAG"
                                    width={40}
                                    height={40}
                                    className="h-10 w-10"
                                />
                            </Link>
                        </div>
                        <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${isActive(link.href)
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                                        }`}
                                >
                                    {link.name}
                                    {link.name === 'Notifications' && unreadCount > 0 && (
                                        <span className="ml-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                            {unreadCount}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Desktop Right Side */}
                    <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
                        <ThemeToggle />
                        <button
                            onClick={() => signOut()}
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Mobile Right Side */}
                    <div className="flex items-center sm:hidden space-x-2">
                        <ThemeToggle />
                        <button
                            onClick={() => signOut()}
                            className="text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/10 px-2.5 py-1.5 rounded-lg active:bg-red-500/20 transition cursor-pointer"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
