import React from 'react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex items-center justify-center auth-bg py-6 sm:py-12 px-3 sm:px-6 lg:px-8">
            <div className="w-full max-w-md md:max-w-xl">
                {children}
            </div>
        </div>
    );
}
