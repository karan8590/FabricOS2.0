import MainLayout from '@/components/layout/MainLayout';

export default function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
