import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ChallanData {
    challan_number: string;
    date: string;
    challan_type: 'jobwork' | 'dispatch' | 'sample';
    order_number?: string;
    from_name: string;
    from_address: string;
    from_phone?: string;
    from_gstin: string;
    from_logo?: string;
    to_name: string;
    to_address: string;
    to_gstin: string;
    purpose: string;
    vehicle_number?: string;
    transporter?: string;
    expected_return_date?: string;
    items: {
        description: string;
        quantity: number | string;
        unit: string;
        value: number | string;
    }[];
    total_quantity: number | string;
    total_value: number | string;
}

export function generateChallanPdf(data: ChallanData): jsPDF {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    
    // Set Font
    doc.setFont('helvetica');

    // Header Section
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(data.from_name || 'FabricOS Company', margin, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 101, 96); // #6B6560
    const splitAddress = doc.splitTextToSize(data.from_address || '', 100);
    doc.text(splitAddress, margin, 32);
    
    let yPos = 32 + (splitAddress.length * 4.5);
    if (data.from_phone) {
        doc.text(`Phone: ${data.from_phone}`, margin, yPos);
        yPos += 4.5;
    }
    if (data.from_gstin) {
        doc.setFont('helvetica', 'bold');
        doc.text(`GSTIN: ${data.from_gstin}`, margin, yPos);
    }

    // "DELIVERY CHALLAN" Box
    doc.setDrawColor(26, 26, 26);
    doc.setLineWidth(0.5);
    doc.rect(pageWidth - 85, margin, 70, 25);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 26, 26);
    doc.text('DELIVERY CHALLAN', pageWidth - 80, margin + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Challan No: ${data.challan_number}`, pageWidth - 80, margin + 15);
    doc.text(`Date: ${new Date(data.date).toLocaleDateString('en-IN')}`, pageWidth - 80, margin + 21);

    // Divider Line
    yPos = Math.max(yPos + 8, margin + 35);
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    
    // From/To Section
    yPos += 8;
    
    // Left: From Details
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 101, 96);
    doc.text('Details of Dispatch:', margin, yPos);
    
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text(data.from_name || 'FabricOS Company', margin, yPos + 6);
    doc.setFont('helvetica', 'normal');
    const dispatchAddress = doc.splitTextToSize(data.from_address || '', 85);
    doc.text(dispatchAddress, margin, yPos + 11);
    
    let leftY = yPos + 11 + (dispatchAddress.length * 4.5);
    if (data.from_gstin) doc.text(`GSTIN: ${data.from_gstin}`, margin, leftY);
    
    // Right: To Details
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 101, 96);
    doc.text('Details of Receiver (Billed To):', pageWidth / 2 + 5, yPos);
    
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 26);
    doc.text(data.to_name || '', pageWidth / 2 + 5, yPos + 6);
    doc.setFont('helvetica', 'normal');
    const toAddress = doc.splitTextToSize(data.to_address || '', 85);
    doc.text(toAddress, pageWidth / 2 + 5, yPos + 11);
    
    let rightY = yPos + 11 + (toAddress.length * 4.5);
    if (data.to_gstin) doc.text(`GSTIN: ${data.to_gstin}`, pageWidth / 2 + 5, rightY);
    
    yPos = Math.max(leftY, rightY) + 15;

    // Items Table
    const tableData = data.items.map((item, index) => [
        index + 1,
        item.description,
        item.quantity,
        item.unit || 'm',
        item.value ? `Rs. ${item.value}` : '-'
    ]);

    tableData.push([
        '', 
        'Total', 
        data.total_quantity.toString(), 
        '', 
        data.total_value ? `Rs. ${data.total_value}` : '-'
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Sr.', 'Description of Goods', 'Quantity', 'Unit', 'Value (Rs)']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: [240, 240, 240],
            textColor: [26, 26, 26],
            fontStyle: 'bold',
            lineWidth: 0.1,
            lineColor: [150, 150, 150]
        },
        styles: {
            font: 'helvetica',
            fontSize: 10,
            textColor: [26, 26, 26],
            lineWidth: 0.1,
            lineColor: [150, 150, 150]
        },
        columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 30, halign: 'right' }
        },
        willDrawCell: function (data: any) {
            if (data.section === 'body' && data.row.index === tableData.length - 1) {
                doc.setFont('helvetica', 'bold');
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Additional Info Section
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    let currentY = finalY;
    if (data.order_number) {
        doc.text(`Linked Order: ${data.order_number}`, margin, currentY);
        currentY += 5;
    }
    if (data.vehicle_number) {
        doc.text(`Vehicle No: ${data.vehicle_number}`, margin, currentY);
        currentY += 5;
    }
    if (data.transporter) {
        doc.text(`Transporter: ${data.transporter}`, margin, currentY);
        currentY += 5;
    }
    if (data.purpose) {
        doc.text(`Purpose: ${data.purpose}`, margin, currentY);
        currentY += 5;
    }
    if (data.expected_return_date && data.challan_type === 'jobwork') {
        doc.text(`Expected Return Date: ${new Date(data.expected_return_date).toLocaleDateString('en-IN')}`, margin, currentY);
        currentY += 5;
    }

    // Terms
    currentY += 10;
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text('1. This is a delivery challan for movement of goods, not a tax invoice.', margin, currentY + 5);
    doc.text('2. GST is not applicable on this document as it does not represent a sale.', margin, currentY + 10);
    if (data.challan_type === 'jobwork') {
        doc.text('3. Goods are sent for job work and must be returned within the stipulated time.', margin, currentY + 15);
    }

    // Signatures
    const sigY = currentY + 45;
    doc.setDrawColor(26, 26, 26);
    
    // Receiver
    doc.line(margin, sigY, margin + 50, sigY);
    doc.text('Receiver\'s Signature & Seal', margin, sigY + 5);
    
    // Authorised
    doc.line(pageWidth - margin - 60, sigY, pageWidth - margin, sigY);
    doc.text('For ' + (data.from_name || 'Authorised Signatory'), pageWidth - margin - 60, sigY + 5);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const footerText = `Generated by FabricOS | ${data.challan_number} | ${new Date().toLocaleString('en-IN')}`;
    doc.text(footerText, pageWidth / 2, 285, { align: 'center' });

    return doc;
}
