import React from 'react';

export const Footer = () => {
    return (
        <footer className="bg-card border-t border-border mt-auto">
            <div className="w-full py-6 px-2 sm:px-4 lg:px-6">
                <div className="text-center text-sm text-muted-foreground">
                    <p>For complaint or support, please contact: <a href="mailto:ohabuenyiagegrade@gmail.com" className="text-primary hover:underline font-medium">ohabuenyiagegrade@gmail.com</a></p>
                    <p className="mt-2 text-xs">&copy; {new Date().getFullYear()} OBEAG. All rights reserved.</p>
                    <p className="mt-1 text-xs">Powered by <a href="https://www.ocubyte.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ocubyte</a></p>
                </div>
            </div>
        </footer>
    );
};
