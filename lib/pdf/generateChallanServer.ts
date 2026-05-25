import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ChallanPDFData {
    challan_number: string;
    dispatch_number: string;
    dispatch_date: number;
    customer_name: string;
    customer_phone: string;
    customer_address?: string;
    customer_gstin?: string;
    driver_name: string;
    vehicle_number: string;
    driver_phone?: string;
    route?: string;
    orders: Array<{
        order_number: string;
        design_name: string;
        fabric_type: string;
        quantity: number;
    }>;
    total_quantity: number;
    total_value?: number;
    notes?: string;
    seller_name?: string;
    seller_phone?: string;
    seller_address?: string;
    seller_gstin?: string;
    seller_logo?: string;
}

export async function generateChallanPDFServer(data: ChallanPDFData): Promise<{ buffer: Buffer }> {
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
    // ==========================================    // Left: Business Info
    let currentY = startY;
    if (data.seller_logo) {
        try {
            doc.addImage(data.seller_logo, margin, currentY, 25, 25);
            currentY += 30;
        } catch (e) {
            console.error('Failed to add challan logo:', e);
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
    doc.text(`${phoneStr} | E-mail: billing@fabricos.com`, margin, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(`GSTIN: ${data.seller_gstin || '24AAECF1234A1Z0'}`, margin, currentY);

    // Right: Document Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(colorTextPrimary);
    doc.text('DELIVERY CHALLAN', rightX, startY + 4, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    currentY = startY + 12;
    doc.text(`Challan No: ${data.challan_number}`, rightX, currentY, { align: 'right' });
    currentY += 4;
    doc.text(`Dispatch No: ${data.dispatch_number}`, rightX, currentY, { align: 'right' });
    currentY += 4;
    doc.text(`Date: ${formatDate(data.dispatch_date)}`, rightX, currentY, { align: 'right' });

    currentY += 6;
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);

    // ==========================================
    // 2. CUSTOMER & TRANSPORT DETAILS (Split Cards)
    // ==========================================
    currentY += 5;
    const cardHeight = 30;
    const cardWidth = (contentWidth - 5) / 2;
    
    // Left Card (Customer)
    doc.setFillColor(colorBgAlt);
    doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorTextSecondary);
    doc.text('DELIVER TO (CUSTOMER)', margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(colorTextPrimary);
    doc.text(data.customer_name, margin + 4, currentY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    doc.text(`Phone: ${data.customer_phone}`, margin + 4, currentY + 14.5);
    if (data.customer_address) {
        doc.text(data.customer_address.substring(0, 40), margin + 4, currentY + 19);
    }
    if (data.customer_gstin) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${data.customer_gstin}`, margin + 4, currentY + 24);
    }

    // Right Card (Transport)
    const rightCardX = margin + cardWidth + 5;
    doc.setFillColor(colorBgAlt);
    doc.roundedRect(rightCardX, currentY, cardWidth, cardHeight, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorTextSecondary);
    doc.text('TRANSPORT DETAILS', rightCardX + 4, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextPrimary);
    doc.text(`Driver: ${data.driver_name}`, rightCardX + 4, currentY + 10);
    doc.text(`Vehicle No: ${data.vehicle_number}`, rightCardX + 4, currentY + 14.5);
    if (data.driver_phone) {
        doc.text(`Phone: ${data.driver_phone}`, rightCardX + 4, currentY + 19);
    }
    if (data.route) {
        doc.text(`Route: ${data.route}`, rightCardX + 4, currentY + 23.5);
    }

    // ==========================================
    // 3. PRODUCT TABLE
    // ==========================================
    currentY += cardHeight + 6;

    const tableHeaders = [
        'S.No',
        'Order ID',
        'Design Name',
        'Fabric Type',
        'Quantity'
    ];

    const tableRows = data.orders.map((o, idx) => [
        (idx + 1).toString(),
        o.order_number,
        o.design_name,
        o.fabric_type,
        `${o.quantity.toFixed(2)} Mtr`
    ]);

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
            4: { halign: 'right' }
        },
        styles: {
            overflow: 'linebreak'
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 6;

    // ==========================================
    // 4. SUMMARY & NOTES
    // ==========================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Total Items: ${data.orders.length}`, margin, finalY);
    doc.text(`Total Quantity: ${data.total_quantity.toFixed(2)} Mtr`, margin, finalY + 5);

    if (data.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(colorTextSecondary);
        doc.text(`Notes: ${data.notes}`, margin, finalY + 12);
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
    
    // Receiver Sign
    doc.text('Receiver\'s Signature & Seal', margin, footerStartY + 25);
    doc.setDrawColor(colorTextSecondary);
    doc.setLineWidth(0.1);
    doc.line(margin, footerStartY + 21, margin + 40, footerStartY + 21);

    // Driver Sign
    doc.text('Driver\'s Signature', margin + 70, footerStartY + 25);
    doc.line(margin + 70, footerStartY + 21, margin + 110, footerStartY + 21);

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
