import MainLayout from '@/components/layout/MainLayout';

export default function ExpensesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <MainLayout>{children}</MainLayout>;
}
