import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface VendorChallanPDFData {
    dispatch_number: string;
    sent_date: number;
    vendor_name: string;
    vendor_phone?: string;
    process_type: string;
    order_number?: string;
    orders?: { order_number: string; design_name: string; fabric_type: string; quantity: number; rate_per_meter: number; total_cost: number; }[];
    design_name: string;
    fabric_type: string;
    quantity: number;
    rate_per_meter: number;
    total_cost: number;
    expected_return_date?: number | null;
    notes?: string;
    seller_name?: string;
    seller_phone?: string;
    seller_address?: string;
    seller_gstin?: string;
    seller_logo?: string;
}

export async function generateVendorChallanPDFServer(data: VendorChallanPDFData): Promise<{ buffer: Buffer }> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const colorTextPrimary = '#1e293b'; // Slate 800
    const colorTextSecondary = '#64748b'; // Slate 500
    const colorBorder = '#cbd5e1'; // Slate 300
    const colorBgAlt = '#f8fafc'; // Slate 50

    const formatDate = (timestamp: number) => {
        const d = new Date(timestamp * 1000);
        return d.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const margin = 15;
    const startY = 15;
    const pageWidth = 210;
    const contentWidth = pageWidth - (2 * margin);
    const rightX = pageWidth - margin;

    // ==========================================
    // 1. HEADER SECTION
    // ==========================================
    let currentY = startY;
    if (data.seller_logo) {
        try {
            doc.addImage(data.seller_logo, margin, currentY, 25, 25);
            currentY += 30;
        } catch (e) {
            console.error('Failed to add vendor challan logo:', e);
            currentY = startY;
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(colorTextPrimary);
    doc.text(data.seller_name || 'FABRICOS TEXTILES', margin, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    
    const address = data.seller_address || 'Plot No. 45-48, Sachin GIDC, Surat, Gujarat - 394230';
    doc.text(address, margin, currentY);
    currentY += 4;
    const phoneStr = data.seller_phone ? `Phone: ${data.seller_phone}` : 'Phone: +91 98765 43210';
    doc.text(`${phoneStr} | E-mail: dispatch@fabricos.com`, margin, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(`GSTIN: ${data.seller_gstin || '24AAECF1234A1Z0'}`, margin, currentY);

    // Right: Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(colorTextPrimary);
    doc.text('JOB WORK CHALLAN', rightX, startY + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    currentY = startY + 12;
    doc.text(`Dispatch No: ${data.dispatch_number}`, rightX, currentY, { align: 'right' });
    currentY += 4;
    doc.text(`Date: ${formatDate(data.sent_date)}`, rightX, currentY, { align: 'right' });
    currentY += 4;
    doc.text(`Process: ${data.process_type.toUpperCase()}`, rightX, currentY, { align: 'right' });

    currentY += 6;
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // ==========================================
    // 2. VENDOR DETAILS (Single Card)
    // ==========================================
    currentY += 5;
    const cardHeight = 25;
    
    doc.setFillColor(colorBgAlt);
    doc.roundedRect(margin, currentY, contentWidth, cardHeight, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorTextSecondary);
    doc.text('JOB WORK VENDOR', margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(colorTextPrimary);
    doc.text(data.vendor_name, margin + 4, currentY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    if (data.vendor_phone) {
        doc.text(`Phone: ${data.vendor_phone}`, margin + 4, currentY + 14.5);
    }
    if (data.expected_return_date) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#D97706'); // warning color
        doc.text(`Expected Return: ${formatDate(data.expected_return_date)}`, rightX - 4, currentY + 10, { align: 'right' });
    }

    // ==========================================
    // 3. PRODUCT TABLE
    // ==========================================
    currentY += cardHeight + 6;

    const tableHeaders = [
        'Order ID',
        'Design Name',
        'Fabric Type',
        'Quantity',
        'Rate/Mtr',
        'Total Cost'
    ];

    const tableRows = [
        [
            data.order_number,
            data.design_name,
            data.fabric_type,
            `${data.quantity.toFixed(2)} m`,
            `Rs. ${data.rate_per_meter}`,
            `Rs. ${data.total_cost.toFixed(2)}`
        ]
    ];

    autoTable(doc, {
        startY: currentY,
        head: [tableHeaders],
        body: tableRows,
        theme: 'plain',
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: '#f1f5f9',
            textColor: colorTextPrimary,
            font: 'helvetica',
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 3.5,
            lineWidth: 0.1,
            lineColor: colorBorder
        },
        bodyStyles: {
            textColor: colorTextPrimary,
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 3.5,
            lineWidth: 0.1,
            lineColor: colorBorder
        },
        columnStyles: {
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' }
        },
        styles: {
            overflow: 'linebreak'
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 6;

    if (data.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(colorTextSecondary);
        doc.text(`Notes: ${data.notes}`, margin, finalY);
    }

    // ==========================================
    // 5. SIGNATURES
    // ==========================================
    const footerStartY = 240;

    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, footerStartY, pageWidth - margin, footerStartY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colorTextPrimary);
    
    // Vendor Sign
    doc.text('Vendor\'s Signature & Seal', margin, footerStartY + 25);
    doc.setDrawColor(colorTextSecondary);
    doc.setLineWidth(0.1);
    doc.line(margin, footerStartY + 21, margin + 45, footerStartY + 21);

    // Authorized Sign
    doc.text(`For, ${data.seller_name?.toUpperCase() || 'FABRICOS TEXTILES'}`, rightX, footerStartY + 5, { align: 'right' });
    doc.line(pageWidth - margin - 45, footerStartY + 21, rightX, footerStartY + 21);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(colorTextSecondary);
    doc.text('Authorized Signatory', rightX, footerStartY + 25, { align: 'right' });

    // Output to Buffer
    const arrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);

    return { buffer };
}
