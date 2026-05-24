/**
 * Core Financial Calculation Engine for FabricOS
 * This module is the single source of truth for all financial parsing and math.
 */

/**
 * Safely parses any database value (which might be a string, null, undefined, or Number)
 * into a valid float. Prevents string concatenation bugs.
 */
export function parseSafeNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    
    let num = 0;
    try {
        if (typeof value === 'number') {
            num = value;
        } else if (typeof value === 'string') {
            const cleanStr = value.replace(/[^\d.-]/g, '');
            if (cleanStr.length > 15) {
                console.warn(`[FinancialEngine] Suspiciously large string detected: ${value}`);
            }
            num = parseFloat(cleanStr);
        } else if (typeof value === 'bigint') {
            num = Number(value);
        }
    } catch (e) {
        num = 0;
    }
    
    if (isNaN(num) || !isFinite(num)) return 0;
    return Math.round(num * 100) / 100;
}

/**
 * Centralized Indian Rupee formatter.
 * Rules:
 * < 1 Lakh: ₹57,500
 * 1 Lakh+: ₹1.15L
 * 1 Crore+: ₹1.2Cr
 */
export function formatCurrencyINR(value: any): string {
    const num = parseSafeNumber(value);
    const absNum = Math.abs(num);

    if (absNum >= 10000000) {
        return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')}Cr`;
    } else if (absNum >= 100000) {
        return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')}L`;
    } else {
        return `₹${num.toLocaleString('en-IN', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        })}`;
    }
}

export interface OrderFinancials {
    baseAmount: number;
    printingCost: number;
    embroideryCostCharged: number;
    dyeingCostCharged: number;
    additionalCharges: number;
    discount: number;
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    finalTotal: number;
}

/**
 * Calculates the final order financials based on the single source of truth formula:
 * Base Fabric + Printing + Embroidery + Dyeing + Additional Charges + GST - Discounts
 */
export function calculateOrderFinancials(order: any): OrderFinancials {
    const quantity = parseSafeNumber(order.quantity_meters);
    const pricePerUnit = parseSafeNumber(order.price_per_unit || order.price_per_meter);
    const rawBase = quantity * pricePerUnit;

    const baseAmount = (order.base_amount !== undefined && order.base_amount !== null) ? parseSafeNumber(order.base_amount) : rawBase || parseSafeNumber(order.total_price);
    const printingCost = parseSafeNumber(order.printing_cost);
    const embroideryCostCharged = parseSafeNumber(order.embroidery_cost_charged);
    const dyeingCostCharged = parseSafeNumber(order.dyeing_cost_charged);
    const additionalCharges = parseSafeNumber(order.additional_charges);
    const discount = parseSafeNumber(order.discount);
    const gstRate = parseSafeNumber(order.gst_rate);
    const storedGstAmount = (order.gst_amount !== undefined && order.gst_amount !== null) ? parseSafeNumber(order.gst_amount) : 0;

    let subtotal = 0;
    if (
        (order.base_amount !== undefined && order.base_amount !== null) || 
        (order.printing_cost !== undefined && order.printing_cost !== null) || 
        (order.embroidery_cost_charged !== undefined && order.embroidery_cost_charged !== null) || 
        (order.additional_charges !== undefined && order.additional_charges !== null) ||
        (order.discount !== undefined && order.discount !== null)
    ) {
        subtotal = baseAmount + printingCost + embroideryCostCharged + dyeingCostCharged + additionalCharges;
    } else {
        subtotal = baseAmount; // fallback for legacy orders
    }

    let gstAmount = storedGstAmount;
    if (gstRate > 0 && gstAmount === 0) {
        gstAmount = (subtotal - discount) * (gstRate / 100);
    }

    const finalTotal = subtotal + gstAmount - discount;

    return {
        baseAmount,
        printingCost,
        embroideryCostCharged,
        dyeingCostCharged,
        additionalCharges,
        discount,
        subtotal,
        gstRate,
        gstAmount,
        finalTotal: Math.round(finalTotal * 100) / 100
    };
}

export function calculateInvoiceOutstanding(invoiceAmount: any, amountPaid: any): number {
    const invAmt = parseSafeNumber(invoiceAmount);
    const paid = parseSafeNumber(amountPaid);
    const outstanding = invAmt - paid;
    return Math.max(0, Math.round(outstanding * 100) / 100);
}
