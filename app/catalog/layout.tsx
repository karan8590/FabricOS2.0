import MainLayout from '@/components/layout/MainLayout';

export default function CatalogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
