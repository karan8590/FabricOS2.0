import MainLayout from '@/components/layout/MainLayout';

export default function VendorsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
