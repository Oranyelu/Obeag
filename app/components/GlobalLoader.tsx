'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function GlobalLoader() {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000); // Minimum loading time of 2 seconds

        return () => clearTimeout(timer);
    }, []);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-[9999]">
            <div className="relative">
                <Image
                    src="/logo.svg"
                    alt="Loading..."
                    width={100}
                    height={100}
                    className="animate-coin-flip"
                />
            </div>
        </div>
    );
}
