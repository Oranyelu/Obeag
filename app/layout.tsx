import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import { ThemeProvider } from "./providers/ThemeProvider";
import GlobalLoader from "./components/GlobalLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "OBEAG",
    description: "Association Dues Tracker",
    icons: {
        icon: '/icon.svg',
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${inter.className} antialiased text-foreground`}
                suppressHydrationWarning
            >
                <ThemeProvider
                    attribute="data-theme"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <Providers>
                        <GlobalLoader />
                        {children}
                    </Providers>
                </ThemeProvider>
            </body>
        </html>
    );
}
