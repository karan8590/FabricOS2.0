import { 
    Package, 
    Truck, 
    Box, 
    Building, 
    Wallet, 
    HandCoins, 
    Wrench, 
    Zap, 
    Coffee, 
    Receipt,
    Scissors,
    Droplets
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface CategoryStyle {
    label: string;
    icon: LucideIcon;
    bg: string;
    border: string;
    text: string;
}

export const EXPENSE_CATEGORY_STYLES: Record<string, CategoryStyle> = {
    'Raw Material': {
        label: 'RAW MATERIAL',
        icon: Package,
        bg: 'var(--badge-material-bg)',
        border: 'var(--badge-material-border)',
        text: 'var(--badge-material-color)'
    },
    'Transport & Delivery': {
        label: 'TRANSPORT',
        icon: Truck,
        bg: 'var(--badge-transport-bg)',
        border: 'var(--badge-transport-border)',
        text: 'var(--badge-transport-color)'
    },
    'Packaging': {
        label: 'PACKAGING',
        icon: Box,
        bg: 'var(--badge-packaging-bg)',
        border: 'var(--badge-packaging-border)',
        text: 'var(--badge-packaging-color)'
    },
    'Rent': {
        label: 'RENT',
        icon: Building,
        bg: 'var(--badge-rent-bg)',
        border: 'var(--badge-rent-border)',
        text: 'var(--badge-rent-color)'
    },
    'Staff Salary': {
        label: 'STAFF SALARY',
        icon: Wallet,
        bg: 'var(--badge-salary-bg)',
        border: 'var(--badge-salary-border)',
        text: 'var(--badge-salary-color)'
    },
    'Staff Advance': {
        label: 'STAFF ADVANCE',
        icon: HandCoins,
        bg: 'var(--badge-advance-bg)',
        border: 'var(--badge-advance-border)',
        text: 'var(--badge-advance-color)'
    },
    'Machine Repair & Maintenance': {
        label: 'MACHINE REPAIR',
        icon: Wrench,
        bg: 'var(--badge-repair-bg)',
        border: 'var(--badge-repair-border)',
        text: 'var(--badge-repair-color)'
    },
    'Electricity & Utilities': {
        label: 'ELECTRICITY',
        icon: Zap,
        bg: 'var(--badge-electricity-bg)',
        border: 'var(--badge-electricity-border)',
        text: 'var(--badge-electricity-color)'
    },
    'Staff Welfare': {
        label: 'STAFF WELFARE',
        icon: Coffee,
        bg: 'var(--badge-welfare-bg)',
        border: 'var(--badge-welfare-border)',
        text: 'var(--badge-welfare-color)'
    },
    'Miscellaneous': {
        label: 'MISCELLANEOUS',
        icon: Receipt,
        bg: 'var(--badge-misc-bg)',
        border: 'var(--badge-misc-border)',
        text: 'var(--badge-misc-color)'
    },
    'Embroidery Work': {
        label: 'EMBROIDERY WORK',
        icon: Scissors,
        bg: '#EEF2FF',
        border: '#C7D2FE',
        text: '#4F46E5'
    },
    'Dyeing Work': {
        label: 'DYEING WORK',
        icon: Droplets,
        bg: '#F0FDFA',
        border: '#CCFBF1',
        text: '#0D9488'
    },
    // Cash IN categories
    'Invoice Payment': {
        label: 'INVOICE PAYMENT',
        icon: Receipt,
        bg: '#F0FDF4',
        border: '#DCFCE7',
        text: '#15803D'
    },
    'Cash Sale': {
        label: 'CASH SALE',
        icon: Wallet,
        bg: '#F0FDF4',
        border: '#DCFCE7',
        text: '#15803D'
    },
    'Refund Received': {
        label: 'REFUND RECEIVED',
        icon: HandCoins,
        bg: '#F0FDF4',
        border: '#DCFCE7',
        text: '#15803D'
    },
    'Other Income': {
        label: 'OTHER INCOME',
        icon: Package,
        bg: '#F0FDF4',
        border: '#DCFCE7',
        text: '#15803D'
    }
};

export function getCategoryStyle(categoryName?: string | null): CategoryStyle {
    if (!categoryName) {
        return EXPENSE_CATEGORY_STYLES['Miscellaneous'];
    }

    const style = EXPENSE_CATEGORY_STYLES[categoryName];
    if (style) return style;

    const normalizedKey = Object.keys(EXPENSE_CATEGORY_STYLES).find(
        key => key.toLowerCase().trim() === categoryName.toLowerCase().trim()
    );
    if (normalizedKey) return EXPENSE_CATEGORY_STYLES[normalizedKey];

    return EXPENSE_CATEGORY_STYLES['Miscellaneous'];
}
