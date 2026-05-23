import MainLayout from '@/components/layout/MainLayout';

export default function VendorPaymentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
