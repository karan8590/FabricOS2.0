import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import { ToastProvider } from '@/contexts/ToastContext';
import MobileWarning from '@/components/ui/MobileWarning';

export const metadata: Metadata = {
    title: 'FabricOS - Textile Manufacturing ERP',
    description: 'Premium textile manufacturing management system',
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="manifest" href="/manifest.json" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="FabricOS" />
                <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                <MobileWarning />
                <ToastProvider>
                    <AuthProvider>
                        <BusinessProvider>
                            {children}
                        </BusinessProvider>
                    </AuthProvider>
                </ToastProvider>
            </body>
        </html>
    );
}
