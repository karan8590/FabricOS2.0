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
        customer_name?: string;
        customer_phone?: string;
        customer_address?: string;
        customer_gstin?: string;
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
    doc.setFontSize(18); // Mobile Optimized: 18
    doc.setTextColor(colorTextPrimary);
    doc.text('DELIVERY CHALLAN', rightX, rightY, { align: 'right' });
    
    rightY += 8;
    const valueStartX = rightX - 40; // Fixed x-coordinate for values to start (left aligned)
    const labelEndX = rightX - 43;   // Fixed x-coordinate for labels to end (right aligned)

    doc.setFontSize(10); // Mobile Optimized: 10
    
    // Challan No
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Challan No:', labelEndX, rightY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.challan_number, valueStartX, rightY);
    
    rightY += 6;
    // Dispatch ID
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Dispatch ID:', labelEndX, rightY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.dispatch_number, valueStartX, rightY);
    
    rightY += 6;
    // Date
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Date:', labelEndX, rightY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(formatDate(data.dispatch_date), valueStartX, rightY);

    currentY = Math.max(currentY + 6, rightY + 8);
    
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.25);
    doc.line(margin, currentY, rightX, currentY);

    // ==========================================
    // 2. CUSTOMER & TRANSPORT DETAILS (Split Cards - Mobile Sizing)
    // ==========================================
    currentY += 6;
    const cardHeight = 36; // Increased height
    const cardWidth = (contentWidth - 6) / 2;
    
    // Left Card (Customer)
    doc.setDrawColor(colorBorder);
    doc.setLineWidth(0.25);
    doc.setFillColor('#ffffff');
    doc.roundedRect(margin, currentY, cardWidth, cardHeight, 1.5, 1.5, 'DF');
    
    doc.setFillColor(colorBgAlt);
    doc.roundedRect(margin, currentY, cardWidth, 8, 1.5, 1.5, 'F');
    // cover bottom corners of header
    doc.rect(margin, currentY + 4, cardWidth, 4, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    doc.text('DELIVER TO', margin + 5, currentY + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12); // Mobile Optimized customer name
    doc.setTextColor(colorTextPrimary);
    doc.text(data.customer_name, margin + 5, currentY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5); // Mobile Optimized details
    doc.setTextColor(colorTextSecondary);
    
    if (data.customer_name === 'MULTIPLE CUSTOMERS') {
        doc.text('See routing table below for customer-wise', margin + 5, currentY + 19);
        doc.text('delivery details.', margin + 5, currentY + 23);
    } else {
        if (data.customer_address) {
            const addrLines = doc.splitTextToSize(data.customer_address, cardWidth - 10);
            doc.text(addrLines, margin + 5, currentY + 19);
            // adjust Y for phone based on address length
            currentY += Math.max(0, (addrLines.length - 1) * 4);
        }
        
        doc.text(`Phone: ${data.customer_phone}`, margin + 5, currentY + 27);
        
        if (data.customer_gstin) {
            doc.setFont('helvetica', 'bold');
            doc.text(`GSTIN: ${data.customer_gstin}`, margin + 5, currentY + 31.5);
        }
    }

    // Right Card (Transport)
    const rightCardX = margin + cardWidth + 6;
    doc.setFillColor('#ffffff');
    doc.roundedRect(rightCardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'DF');
    
    doc.setFillColor(colorBgAlt);
    doc.roundedRect(rightCardX, currentY, cardWidth, 8, 1.5, 1.5, 'F');
    doc.rect(rightCardX, currentY + 4, cardWidth, 4, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(colorTextSecondary);
    doc.text('TRANSPORT DETAILS', rightCardX + 5, currentY + 5.5);

    let tY = currentY + 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5); // Mobile Optimized transport text
    
    doc.setTextColor(colorTextSecondary);
    doc.text('Driver:', rightCardX + 5, tY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.driver_name || 'N/A', rightCardX + 22, tY);
    
    tY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Vehicle No:', rightCardX + 5, tY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.vehicle_number || 'N/A', rightCardX + 25, tY);
    
    tY += 5.5;
    if (data.driver_phone) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorTextSecondary);
        doc.text('Phone:', rightCardX + 5, tY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorTextPrimary);
        doc.text(data.driver_phone, rightCardX + 18, tY);
        tY += 5.5;
    }
    
    if (data.route) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorTextSecondary);
        doc.text('Route:', rightCardX + 5, tY);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colorTextPrimary);
        doc.text(data.route.substring(0, 26), rightCardX + 17, tY);
    }

    // ==========================================
    // 3. PRODUCT TABLE
    // ==========================================
    currentY += cardHeight + 8;

    const groupedOrders = new Map<string, any[]>();
    data.orders.forEach(o => {
        const custName = o.customer_name || data.customer_name || 'Unknown Customer';
        if (!groupedOrders.has(custName)) {
            groupedOrders.set(custName, []);
        }
        groupedOrders.get(custName)!.push(o);
    });

    const tableBody: any[] = [];
    let globalIdx = 1;

    groupedOrders.forEach((orders, customerName) => {
        const firstOrder = orders[0];
        const addr = firstOrder.customer_address || 'Address pending';
        const phone = firstOrder.customer_phone || data.customer_phone || 'N/A';
        const gstin = firstOrder.customer_gstin ? ` | GSTIN: ${firstOrder.customer_gstin}` : '';
        
        // Address max length to avoid awkward wrapping in header
        let shortAddr = addr.replace(/\n/g, ' ');
        if (shortAddr.length > 55) shortAddr = shortAddr.substring(0, 52) + '...';

        tableBody.push([{
            content: `${customerName.toUpperCase()}  |  Ph: ${phone}${gstin}  |  Route: ${shortAddr}`,
            colSpan: 5,
            styles: { 
                fillColor: '#f1f5f9',
                textColor: '#0f172a',
                fontStyle: 'bold',
                halign: 'left',
                cellPadding: { top: 4.5, bottom: 4.5, left: 4.5, right: 4.5 }
            }
        }]);

        orders.forEach(o => {
            tableBody.push([
                (globalIdx++).toString(),
                o.order_number,
                o.design_name,
                o.fabric_type,
                `${o.quantity.toFixed(2)} Mtr`
            ]);
        });
    });

    autoTable(doc, {
        startY: currentY,
        head: [['S.No', 'Order ID', 'Design Name', 'Fabric Type', 'Quantity']],
        body: tableBody,
        theme: 'grid',
        margin: { left: margin, right: margin },
        headStyles: {
            fillColor: '#f8fafc',
            textColor: colorTextPrimary,
            font: 'helvetica',
            fontStyle: 'bold',
            fontSize: 9.5,
            cellPadding: { top: 4.5, bottom: 4.5, left: 2, right: 2 },
            lineWidth: 0.1,
            lineColor: colorBorder,
            valign: 'middle',
            halign: 'center'
        },
        bodyStyles: {
            textColor: colorTextPrimary,
            font: 'helvetica',
            fontSize: 9.5,
            cellPadding: { top: 4.5, bottom: 4.5, left: 3, right: 3 },
            lineWidth: 0.1,
            lineColor: colorBorder,
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: '#ffffff' // Override alternate to avoid clashing with group header
        },
        columnStyles: {
            0: { cellWidth: 12, halign: 'center' }, // S.No
            1: { cellWidth: 38 }, // Order ID
            2: { cellWidth: 'auto' }, // Design
            3: { cellWidth: 35 }, // Fabric
            4: { halign: 'right', cellWidth: 26 } // Qty
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
    doc.setLineWidth(0.25);
    doc.setFillColor('#f8fafc');
    doc.roundedRect(summaryX, finalY, summaryWidth, 18, 1, 1, 'DF');
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5); // Mobile Optimized: 9.5
    doc.setTextColor(colorTextSecondary);
    doc.text('Total Orders:', summaryX + 5, finalY + 7);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colorTextPrimary);
    doc.text(data.orders.length.toString(), rightX - 5, finalY + 7, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colorTextSecondary);
    doc.text('Total Quantity:', summaryX + 5, finalY + 13);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5); // Mobile Optimized: 10.5
    doc.setTextColor(colorTextPrimary);
    doc.text(`${data.total_quantity.toFixed(2)} Mtr`, rightX - 5, finalY + 13, { align: 'right' });

    if (data.notes) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
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
