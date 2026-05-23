import MainLayout from '@/components/layout/MainLayout';

export default function MyOrdersLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
