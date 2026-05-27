import MainLayout from '@/components/layout/MainLayout';

export default function DispatchCenterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
