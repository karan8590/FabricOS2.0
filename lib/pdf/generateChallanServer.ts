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
    const colorBgAlt = '#f1f5f9'; // Slate 100

    const formatDate = (timestamp: number) => {
        const d = new Date(timestamp * 1000);
        return d.toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const margin = 15;
    const pageWidth = 210;
    const contentWidth = pageWidth - (2 * margin);
    const rightX = pageWidth - margin;
    
    let currentY = 15;

    // ==========================================
    // 1. HEADER SECTION
    // ==========================================
    // Left: Business Info
    if (data.seller_logo) {
        try {
            // max height 15mm (~40-45px)
            doc.addImage(data.seller_logo, margin, currentY, 15, 15);
            currentY += 18;
        } catch (e) {
            console.error('Failed to add challan logo:', e);
        }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(colorTextPrimary);
    doc.text(data.seller_name || 'FABRICOS TEXTILES', margin, currentY);
    
    currentY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorTextSecondary);
    
    const address = data.seller_address || 'Plot No. 45-48, Sachin GIDC, Surat, Gujarat - 394230';
    const splitAddress = doc.splitTextToSize(address, 90);
    doc.text(splitAddress, margin, currentY);
    currentY += (splitAddress.length * 3.5);
    
    const phoneStr = data.seller_phone ? `Ph: ${data.seller_phone}` : 'Ph: +91 98765 43210';
    doc.text(`${phoneStr} | E-mail: billing@fabricos.com`, margin, currentY);
    currentY += 4;
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextSecondary);
    doc.text(`GSTIN: ${data.seller_gstin || '24AAECF1234A1Z0'}`, margin, currentY);

    // Right: Document Title & Details
    let rightY = 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(colorTextPrimary);
    doc.text('DELIVERY CHALLAN', rightX, rightY, { align: 'right' });
    
    rightY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(colorTextSecondary);
    
    doc.text('Challan No:', rightX - 35, rightY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.challan_number, rightX, rightY, { align: 'right' });
    
    rightY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Dispatch ID:', rightX - 35, rightY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.dispatch_number, rightX, rightY, { align: 'right' });
    
    rightY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Date:', rightX - 35, rightY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(formatDate(data.dispatch_date), rightX, rightY, { align: 'right' });

    currentY = Math.max(currentY + 6, rightY + 8);
    
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY, rightX, currentY);

    // ==========================================
    // 2. CUSTOMER & TRANSPORT DETAILS (Split Cards)
    // ==========================================
    currentY += 6;
    const cardHeight = 32;
    const cardWidth = (contentWidth - 6) / 2;
    
    // Left Card (Customer)
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.2);
    doc.setFillColor('#ffffff');
    doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'DF');
    
    doc.setFillColor(colorBgAlt);
    doc.roundedRect(margin, currentY, cardWidth, 7, 1.5, 1.5, 'F');
    // cover bottom corners of header
    doc.rect(margin, currentY + 3.5, cardWidth, 3.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorTextSecondary);
    doc.text('DELIVER TO', margin + 4, currentY + 4.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(colorTextPrimary);
    doc.text(data.customer_name, margin + 4, currentY + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(colorTextSecondary);
    if (data.customer_address) {
        const addrLines = doc.splitTextToSize(data.customer_address, cardWidth - 8);
        doc.text(addrLines, margin + 4, currentY + 16.5);
    }
    
    doc.text(`Phone: ${data.customer_phone}`, margin + 4, currentY + 24.5);
    
    if (data.customer_gstin) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${data.customer_gstin}`, margin + 4, currentY + 28.5);
    }

    // Right Card (Transport)
    const rightCardX = margin + cardWidth + 6;
    doc.setFillColor('#ffffff');
    doc.roundedRect(rightCardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'DF');
    
    doc.setFillColor(colorBgAlt);
    doc.roundedRect(rightCardX, currentY, cardWidth, 7, 1.5, 1.5, 'F');
    doc.rect(rightCardX, currentY + 3.5, cardWidth, 3.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(colorTextSecondary);
    doc.text('TRANSPORT DETAILS', rightCardX + 4, currentY + 4.8);

    let tY = currentY + 12;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    
    doc.setTextColor(colorTextSecondary);
    doc.text('Driver:', rightCardX + 4, tY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.driver_name || 'N/A', rightCardX + 20, tY);
    
    tY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Vehicle No:', rightCardX + 4, tY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.vehicle_number || 'N/A', rightCardX + 22, tY);
    
    tY += 5;
    if (data.driver_phone) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorTextSecondary);
        doc.text('Phone:', rightCardX + 4, tY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorTextPrimary);
        doc.text(data.driver_phone, rightCardX + 16, tY);
        tY += 5;
    }
    
    if (data.route) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorTextSecondary);
        doc.text('Route:', rightCardX + 4, tY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorTextPrimary);
        doc.text(data.route.substring(0, 30), rightCardX + 15, tY);
    }

    // ==========================================
    // 3. PRODUCT TABLE
    // ==========================================
    currentY += cardHeight + 8;

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
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: '#f8fafc',
            textColor: colorTextPrimary,
            font: 'helvetica',
            fontStyle: 'bold',
            fontSize: 8.5,
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: colorBorder
        },
        bodyStyles: {
            textColor: colorTextPrimary,
            font: 'helvetica',
            fontSize: 8.5,
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: colorBorder
        },
        alternateRowStyles: {
            fillColor: '#fdfdfd'
        },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 35 },
            4: { halign: 'right', cellWidth: 30 }
        },
        styles: {
            overflow: 'linebreak'
        }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 8;

    // ==========================================
    // 4. SUMMARY BOX (Right aligned)
    // ==========================================
    
    const summaryWidth = 70;
    const summaryX = rightX - summaryWidth;
    
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.2);
    doc.setFillColor('#f8fafc');
    doc.roundedRect(summaryX, finalY, summaryWidth, 18, 1, 1, 'DF');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    doc.text('Total Orders:', summaryX + 5, finalY + 7);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.orders.length.toString(), rightX - 5, finalY + 7, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Total Quantity:', summaryX + 5, finalY + 13);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(colorTextPrimary);
    doc.text(`${data.total_quantity.toFixed(2)} Mtr`, rightX - 5, finalY + 13, { align: 'right' });

    if (data.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(colorTextSecondary);
        const notesLines = doc.splitTextToSize(`Notes: ${data.notes}`, contentWidth - summaryWidth - 10);
        doc.text(notesLines, margin, finalY + 5);
    }

    // ==========================================
    // 5. SIGNATURES (3 columns)
    // ==========================================
    const pageHeight = 297;
    const footerStartY = Math.max(finalY + 35, pageHeight - 40);

    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.2);
    
    const colWidth = contentWidth / 3;
    
    // Column 1: Receiver
    doc.line(margin, footerStartY, margin + 45, footerStartY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colorTextPrimary);
    doc.text('Receiver\'s Signature', margin + 22.5, footerStartY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(colorTextSecondary);
    doc.text('Name, Date & Seal', margin + 22.5, footerStartY + 9, { align: 'center' });

    // Column 2: Driver
    const col2X = margin + colWidth;
    doc.line(col2X + 10, footerStartY, col2X + 55, footerStartY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colorTextPrimary);
    doc.text('Driver\'s Signature', col2X + 32.5, footerStartY + 5, { align: 'center' });

    // Column 3: Authorized
    doc.line(rightX - 45, footerStartY, rightX, footerStartY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(colorTextPrimary);
    doc.text('Authorized Signatory', rightX - 22.5, footerStartY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(colorTextSecondary);
    doc.text(`For, ${data.seller_name?.toUpperCase() || 'COMPANY'}`, rightX - 22.5, footerStartY + 9, { align: 'center' });

    // Output to Buffer
    const arrayBuffer = doc.output('arraybuffer');
    const buffer = Buffer.from(arrayBuffer);

    return { buffer };
}
