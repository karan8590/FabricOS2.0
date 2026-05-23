export type TelegramPayload = { english: string; gujarati: string };

/**
 * Helper to safely format Indian Rupee values
 */
export function formatINR(amount: number | string | undefined | null): string {
    if (amount === undefined || amount === null) return '₹0';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '₹0';
    
    // For large numbers, format them with 'L' or 'Cr' for better readability
    if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(1)}Cr`;
    }
    if (num >= 100000) {
        return `₹${(num / 100000).toFixed(1)}L`;
    }
    
    return `₹${num.toLocaleString('en-IN')}`;
}

export type ReceivableItem = {
    customerName: string;
    orderNumber: string;
    pendingAmount: number;
};

export type PayableItem = {
    vendorName: string;
    pendingAmount: number;
};

export function buildDailySummaryTemplate(data: {
    dateStr: string;
    receivables: ReceivableItem[];
    payables: PayableItem[];
    totalReceivable: number;
    totalPayable: number;
}): TelegramPayload {
    let recList = data.receivables.map((r, i) => {
        return `${i + 1}. ${r.customerName}\nOrder: ${r.orderNumber}\nAmount: ${formatINR(r.pendingAmount)}`;
    }).join('\n\n');
    if (!recList) recList = 'No receivables due today.';

    let payList = data.payables.map((p, i) => {
        return `${i + 1}. ${p.vendorName}\nAmount: ${formatINR(p.pendingAmount)}`;
    }).join('\n\n');
    if (!payList) payList = 'No payables due today.';

    const en = `📅 ${data.dateStr}\n\n━━━━━━━━━━━━━━━━━━\n\n💰 *Today's Receivable*\n\n${recList}\n\n*Total Receivable Today*:\n${formatINR(data.totalReceivable)}\n\n━━━━━━━━━━━━━━━━━━\n\n💸 *Today's Payable*\n\n${payList}\n\n*Total Payable Today*:\n${formatINR(data.totalPayable)}\n\n━━━━━━━━━━━━━━━━━━\n\nHave a productive day 🚀`;
    
    const guj = `📅 ${data.dateStr}\n\n━━━━━━━━━━━━━━━━━━\n\n💰 *આજની વસૂલાત*\n\n${recList}\n\n*આજની કુલ વસૂલાત*:\n${formatINR(data.totalReceivable)}\n\n━━━━━━━━━━━━━━━━━━\n\n💸 *આજનું ચૂકવવા પાત્ર*\n\n${payList}\n\n*આજનું કુલ ચૂકવવા પાત્ર*:\n${formatINR(data.totalPayable)}\n\n━━━━━━━━━━━━━━━━━━\n\nશુભ દિવસ 🚀`;

    return { english: en, gujarati: guj };
}

export function buildPaymentReminderTemplate(data: {
    invoiceNo: string;
    amount: number;
    daysOverdue: number;
    customerName: string;
}): TelegramPayload {
    const en = `⚠ *Payment Reminder*\n\n*Invoice*: ${data.invoiceNo}\n*Pending Amount*: ${formatINR(data.amount)}\n*Due Since*: ${data.daysOverdue} days\n\nPlease follow up with ${data.customerName} for payment collection.`;
    const guj = `⚠ *પેમેન્ટ રિમાઇન્ડર*\n\n*ઇન્વોઇસ*: ${data.invoiceNo}\n*બાકી રકમ*: ${formatINR(data.amount)}\n*બાકી દિવસો*: ${data.daysOverdue} દિવસ\n\nકૃપા કરીને ${data.customerName} પાસેથી પેમેન્ટ કલેક્શન માટે ફોલો અપ કરો.`;
    return { english: en, gujarati: guj };
}

export function buildProductionUpdateTemplate(data: {
    orderNo: string;
    fabric: string;
    quantity: number;
    currentStatus: string;
    nextStep: string;
    expectedDelivery: string;
}): TelegramPayload {
    const en = `🏭 *Production Update*\n\n*Order*: ${data.orderNo}\n*Fabric*: ${data.fabric}\n*Quantity*: ${data.quantity}m\n\n*Current Status*:\n${data.currentStatus} ✅\n\n*Next Step*:\n${data.nextStep}\n\n*Expected Delivery*:\n${data.expectedDelivery}`;
    const guj = `🏭 *પ્રોડક્શન અપડેટ*\n\n*ઓર્ડર*: ${data.orderNo}\n*કાપડ*: ${data.fabric}\n*જથ્થો*: ${data.quantity}m\n\n*હાલની સ્થિતિ*:\n${data.currentStatus} ✅\n\n*આગળનું પગલું*:\n${data.nextStep}\n\n*અપેક્ષિત ડિલિવરી*:\n${data.expectedDelivery}`;
    return { english: en, gujarati: guj };
}

export function buildOrderAlertTemplate(data: {
    statusLabel: { en: string; guj: string };
    orderNo: string;
    customerName: string;
    designName: string;
    quantity: number;
    value: number;
}): TelegramPayload {
    const en = `${data.statusLabel.en}\n\n*Order*: ${data.orderNo}\n*Customer*: ${data.customerName}\n*Design*: ${data.designName} (${data.quantity}m)\n*Value*: ${formatINR(data.value)}`;
    const guj = `${data.statusLabel.guj}\n\n*ઓર્ડર*: ${data.orderNo}\n*ગ્રાહક*: ${data.customerName}\n*ડિઝાઇન*: ${data.designName} (${data.quantity}m)\n*મૂલ્ય*: ${formatINR(data.value)}`;
    return { english: en, gujarati: guj };
}
