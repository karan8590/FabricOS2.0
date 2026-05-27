import MainLayout from '@/components/layout/MainLayout';

export default function SamplesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
