import MainLayout from '@/components/layout/MainLayout';

export default function ChallansLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
