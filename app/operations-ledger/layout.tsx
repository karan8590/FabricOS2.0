import MainLayout from '@/components/layout/MainLayout';

export default function OperationsLedgerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
