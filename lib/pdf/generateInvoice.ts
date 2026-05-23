import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string;
    order_id: number;
    amount: number;
    amount_paid: number;
    status: string;
    generated_at: number;
    due_date?: number;
    items?: any[]; // If we had line items, for now just 1 order item
}

export const generateInvoicePDF = (invoice: InvoiceData) => {
    const doc = new jsPDF();

    // Colors (Apple-style neutral palette)
    const colorPrimary = '#1d1d1f'; // Apple Text
    const colorSecondary = '#86868b'; // Apple Subtext
    const colorAccent = '#0071e3'; // Apple Blue
    const colorBorder = '#d2d2d7'; // Apple Separator

    // Helper for formatting currency
    const formatCurrency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;
    const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // --- Header ---
    doc.setFontSize(24);
    doc.setTextColor(colorPrimary);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(colorSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text('FabricOS Textiles Ltd.', 20, 30);
    doc.text('123 Fabric Lane, Surat, Gujarat', 20, 35);
    doc.text('GSTIN: 24ABCDE1234F1Z5', 20, 40);

    // Right aligned meta
    doc.setFontSize(10);
    doc.setTextColor(colorSecondary);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 190, 20, { align: 'right' });
    doc.text(`Date: ${formatDate(invoice.generated_at)}`, 190, 25, { align: 'right' });
    if (invoice.due_date) {
        doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 190, 30, { align: 'right' });
    }

    // Status Badge (Draw rectangle + text)
    const statusColor = invoice.status === 'paid' ? '#30d158' : (invoice.status === 'overdue' ? '#ff453a' : '#ff9f0a');
    doc.setFillColor(statusColor);
    doc.roundedRect(160, 35, 30, 8, 2, 2, 'F');
    doc.setTextColor('#ffffff');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.status.toUpperCase(), 175, 40.5, { align: 'center' });

    // Separator
    doc.setDrawColor(colorBorder);
    doc.line(20, 50, 190, 50);

    // --- Bill To ---
    doc.setFontSize(12);
    doc.setTextColor(colorSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text('Bill To:', 20, 60);

    doc.setFontSize(14);
    doc.setTextColor(colorPrimary);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.customer_name, 20, 68);

    doc.setFontSize(10);
    doc.setTextColor(colorSecondary);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.customer_phone, 20, 74);

    // --- Table ---
    // Using autoTable for clean layout
    // Since we don't have line items explicitly in `Invoice` interface from the API (it's flat),
    // we'll simulate a line item using the `order_id` reference and total amount.
    // Ideally we fetch order details. But for now, let's use what we have.
    const tableData = [
        ['Fabric Order', `Ref #${invoice.order_id}`, '-', formatCurrency(invoice.amount)]
    ];

    autoTable(doc, {
        startY: 85,
        head: [['Description', 'Reference', 'Quantity', 'Amount']],
        body: tableData,
        theme: 'plain',
        headStyles: {
            fillColor: '#f5f5f7',
            textColor: colorPrimary,
            fontStyle: 'bold',
            halign: 'left',
            cellPadding: 4
        },
        bodyStyles: {
            textColor: colorPrimary,
            cellPadding: 4
        },
        columnStyles: {
            3: { halign: 'right' }
        },
        styles: {
            lineColor: colorBorder,
            lineWidth: 0.1
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // --- Totals ---
    // Right aligned
    const rightX = 140;
    const valueX = 190;

    doc.setFontSize(10);
    doc.setTextColor(colorSecondary);
    doc.text('Subtotal:', rightX, finalY);
    doc.setTextColor(colorPrimary);
    doc.text(formatCurrency(invoice.amount), valueX, finalY, { align: 'right' });

    doc.setTextColor(colorSecondary);
    doc.text('Tax (0%):', rightX, finalY + 7);
    doc.setTextColor(colorPrimary);
    doc.text(formatCurrency(0), valueX, finalY + 7, { align: 'right' });

    // Separator
    doc.setDrawColor(colorBorder);
    doc.line(rightX, finalY + 12, 190, finalY + 12);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', rightX, finalY + 20);
    doc.text(formatCurrency(invoice.amount), valueX, finalY + 20, { align: 'right' });

    // Payment Info
    if (invoice.amount_paid > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colorSecondary);
        doc.text('Amount Paid:', rightX, finalY + 27);
        doc.setTextColor('#30d158'); // Green
        doc.text(`- ${formatCurrency(invoice.amount_paid)}`, valueX, finalY + 27, { align: 'right' });

        doc.setTextColor(colorPrimary);
        doc.setFont('helvetica', 'bold');
        doc.text('Balance Due:', rightX, finalY + 34);
        doc.text(formatCurrency(Math.max(0, invoice.amount - invoice.amount_paid)), valueX, finalY + 34, { align: 'right' });
    }

    // --- Footer ---
    doc.setFontSize(8);
    doc.setTextColor(colorSecondary);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business.', 105, 280, { align: 'center' });
    doc.text('Generated by FabricOS', 105, 285, { align: 'center' });

    // Save
    doc.save(`INV-${invoice.invoice_number}.pdf`);
};
