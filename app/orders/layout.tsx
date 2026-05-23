import MainLayout from '@/components/layout/MainLayout';

export default function OrdersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
