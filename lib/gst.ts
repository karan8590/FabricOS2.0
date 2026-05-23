export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export interface GSTState {
    code: string;
    name: string;
}

export const GST_STATES: GSTState[] = [
    { code: '35', name: 'Andaman and Nicobar Islands' },
    { code: '37', name: 'Andhra Pradesh' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '18', name: 'Assam' },
    { code: '10', name: 'Bihar' },
    { code: '04', name: 'Chandigarh' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
    { code: '07', name: 'Delhi' },
    { code: '30', name: 'Goa' },
    { code: '24', name: 'Gujarat' },
    { code: '06', name: 'Haryana' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '01', name: 'Jammu and Kashmir' },
    { code: '20', name: 'Jharkhand' },
    { code: '29', name: 'Karnataka' },
    { code: '32', name: 'Kerala' },
    { code: '38', name: 'Ladakh' },
    { code: '31', name: 'Lakshadweep' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '27', name: 'Maharashtra' },
    { code: '14', name: 'Manipur' },
    { code: '17', name: 'Meghalaya' },
    { code: '15', name: 'Mizoram' },
    { code: '13', name: 'Nagaland' },
    { code: '21', name: 'Odisha' },
    { code: '34', name: 'Puducherry' },
    { code: '03', name: 'Punjab' },
    { code: '08', name: 'Rajasthan' },
    { code: '11', name: 'Sikkim' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '36', name: 'Telangana' },
    { code: '16', name: 'Tripura' },
    { code: '09', name: 'Uttar Pradesh' },
    { code: '05', name: 'Uttarakhand' },
    { code: '19', name: 'West Bengal' }
].sort((a, b) => a.name.localeCompare(b.name));

/**
 * Validates a GSTIN string and checks if it matches the selected state code.
 */
export function validateGSTIN(gstin: string, stateCode?: string): { valid: boolean; error?: string } {
    if (!gstin) {
        return { valid: false, error: 'GSTIN is required' };
    }
    
    const cleanGstin = gstin.trim().toUpperCase();
    
    if (!GSTIN_REGEX.test(cleanGstin)) {
        return { valid: false, error: 'Invalid GSTIN format (should be 15 chars, e.g. 24AAAAA0000A1Z5)' };
    }
    
    if (stateCode) {
        const inputStatePrefix = cleanGstin.substring(0, 2);
        if (inputStatePrefix !== stateCode) {
            const expectedState = GST_STATES.find(s => s.code === stateCode)?.name || stateCode;
            return { 
                valid: false, 
                error: `GSTIN state code prefix (${inputStatePrefix}) must match the selected state (${expectedState}, code ${stateCode})` 
            };
        }
    }
    
    return { valid: true };
}

export interface GSTCalculationResult {
    taxableAmount: number;
    gstAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    gstType: 'CGST_SGST' | 'IGST' | 'NONE';
}

/**
 * Calculates GST components (CGST, SGST, IGST) given an amount (gross or taxable),
 * a tax rate (e.g. 5), the place of supply state code, and customer type.
 * Default is inclusive tax calculations.
 */
export function calculateGST({
    amount,
    rate,
    stateCode,
    isB2B,
    isInclusive = true
}: {
    amount: number;
    rate: number;
    stateCode?: string;
    isB2B?: boolean;
    isInclusive?: boolean;
}): GSTCalculationResult {
    const defaultStateCode = '24'; // Gujarat
    const actualStateCode = stateCode || defaultStateCode;
    const isB2BVal = isB2B === undefined ? true : isB2B;

    let taxableAmount = 0;
    let gstAmount = 0;

    if (isInclusive) {
        taxableAmount = amount / (1 + rate / 100);
        gstAmount = amount - taxableAmount;
    } else {
        taxableAmount = amount;
        gstAmount = amount * (rate / 100);
    }

    // Determine GST Type:
    // IGST applies only if B2B and state code is not Gujarat (24)
    // CGST+SGST applies if B2C or state code is Gujarat (24)
    const isLocal = actualStateCode === defaultStateCode || !isB2BVal;
    
    if (rate === 0) {
        return {
            taxableAmount,
            gstAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            gstType: 'NONE'
        };
    }

    if (isLocal) {
        return {
            taxableAmount,
            gstAmount,
            cgstAmount: gstAmount / 2,
            sgstAmount: gstAmount / 2,
            igstAmount: 0,
            gstType: 'CGST_SGST'
        };
    } else {
        return {
            taxableAmount,
            gstAmount,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: gstAmount,
            gstType: 'IGST'
        };
    }
}
