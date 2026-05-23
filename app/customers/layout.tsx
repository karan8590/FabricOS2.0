import MainLayout from '@/components/layout/MainLayout';

export default function CustomersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
