export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

export function formatPercentage(val: number): string {
    return `${Math.round(val)}%`;
}

export function formatShortDate(d: Date): string {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function formatFullDate(d: Date): string {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
