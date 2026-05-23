import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
    title: 'FabricOS - Textile Manufacturing ERP',
    description: 'Premium textile manufacturing management system',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <ToastProvider>
                    <AuthProvider>
                        <BusinessProvider>
                            {children}
                        </BusinessProvider>
                    </AuthProvider>
                </ToastProvider>
                <Analytics />
            </body>
        </html>
    );
}
