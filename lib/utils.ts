export function formatCurrencySafe(value: any): string {
    if (value === null || value === undefined) return '₹0';
    
    let num = 0;
    
    try {
        if (typeof value === 'bigint') {
            num = Number(value);
        } else if (typeof value === 'string') {
            // Strip out ₹, commas, and other non-numeric chars except dot/minus
            const cleanStr = value.replace(/[^\d.-]/g, '');
            // Prevent duplicated string concatenation bugs
            if (cleanStr.length > 15) {
                // If it's absurdly long, it might be a concatenation bug, but we parse what we can
            }
            num = parseFloat(cleanStr);
        } else if (typeof value === 'number') {
            num = value;
        }
    } catch (e) {
        num = 0;
    }
    
    if (isNaN(num) || !isFinite(num)) return '₹0';
    
    // Sanitize
    num = Math.round(num * 100) / 100;
    
    // Indian formatting with Lakhs and Crores
    if (Math.abs(num) >= 10000000) {
        return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    } else if (Math.abs(num) >= 100000) {
        return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    } else {
        return `₹${num.toLocaleString('en-IN', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        })}`;
    }
}

/**
 * Calculates a due date string (YYYY-MM-DD) based on a base date and number of days.
 * @param days Number of days until due
 * @param baseDate The starting date (defaults to today)
 * @returns YYYY-MM-DD string safe from timezone drift
 */
export function calculatePaymentDueDate(days: number, baseDate: Date = new Date()): string {
    const d = new Date(baseDate.getTime());
    // Use local timezone boundaries to avoid UTC drift
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (days || 0));
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}
