import React from 'react';

export const Footer = () => {
    return (
        <footer className="bg-card border-t border-border mt-auto">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="text-center text-sm text-muted-foreground">
                    <p>For complaint or support, please contact: <a href="mailto:ohabuenyiagegrade@gmail.com" className="text-primary hover:underline font-medium">ohabuenyiagegrade@gmail.com</a></p>
                    <p className="mt-2 text-xs">&copy; {new Date().getFullYear()} OBEAG. All rights reserved.</p>
                    <p className="mt-1 text-xs">Powered by <a href="https://www.ocubyte.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ocubyte</a></p>
                </div>
            </div>
        </footer>
    );
};
