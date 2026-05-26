import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function POST(req: Request) {
    try {
        const { authorized, error, status } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { orderIds, challanType = 'dispatch' } = await req.json();

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
        }

        const db = getDatabase();

        // Fetch order details
        const placeholders = orderIds.map((_: any, i: number) => `$${i + 1}`).join(',');
        const orders = await db.prepare(`
            SELECT o.*, d.name as design_name, c.name as customer_name,
                   c.gstin as customer_gstin, c.state as customer_state, c.id as cust_id
            FROM orders o
            LEFT JOIN designs d ON o.design_id = d.id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.id IN (${placeholders})
        `).all(...orderIds) as any[];

        if (!orders.length) {
            return NextResponse.json({ error: 'Orders not found' }, { status: 404 });
        }

        const firstOrder = orders[0];
        let challanPrefix = 'DC';
        let firmSnapshot = '{}';
        let sellerName = 'FabricOS ERP';
        
        if (firstOrder.billing_firm_id) {
            const firm = await db.prepare('SELECT * FROM firms WHERE id = ?').get(firstOrder.billing_firm_id) as any;
            if (firm) {
                challanPrefix = firm.challan_prefix || challanPrefix;
                firmSnapshot = JSON.stringify(firm);
                sellerName = firm.firm_name || sellerName;
            }
        }

        // Generate challan number
        const year = new Date().getFullYear();
        const prefix = `${challanPrefix}-${year}-`;
        const lastChallan = await db.prepare(`
            SELECT challan_number FROM challans WHERE challan_number LIKE ? ORDER BY id DESC LIMIT 1
        `).get(`${prefix}%`) as { challan_number: string } | undefined;

        let nextNum = 1;
        if (lastChallan && lastChallan.challan_number) {
            const parts = lastChallan.challan_number.split('-');
            if (parts.length >= 3) {
                const lastSeq = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastSeq)) {
                    nextNum = lastSeq + 1;
                }
            }
        }
        const challanNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;
        const dateStr = new Date().toISOString().split('T')[0];

        const totalQty = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.quantity_meters) || 0), 0);
        const totalValue = orders.reduce((sum: number, o: any) => sum + (parseFloat(o.total_price) || 0), 0);
        const itemsJson = JSON.stringify(orders.map((o: any) => ({
            order_id: o.id,
            design: o.design_name || 'N/A',
            quantity: o.quantity_meters,
            rate: o.price_per_unit,
            total: o.total_price,
        })));

        // Insert challan and log activity in a transaction
        await db.transaction(async () => {
            await db.prepare(`
                INSERT INTO challans (business_id, challan_number, challan_type, date, to_name, to_gstin, items, total_quantity, total_value, status, billing_firm_id, firm_snapshot)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
            `).run(
                businessId,
                challanNumber,
                challanType,
                dateStr,
                orders[0].customer_name || 'N/A',
                orders[0].customer_gstin || '',
                itemsJson,
                totalQty,
                totalValue,
                firstOrder.billing_firm_id || null,
                firmSnapshot
            );

            // Log activity for each order's customer
            const customerId = orders[0].cust_id;
            if (customerId) {
                await db.prepare(`
                    INSERT INTO activity (business_id, customer_id, type, title, description, meta, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    businessId,
                    customerId,
                    'challan_generated',
                    `Delivery Challan ${challanNumber} Generated`,
                    `Challan for ${orders.length} order(s) — ${totalQty}m total`,
                    JSON.stringify({ challan_number: challanNumber, order_ids: orderIds }),
                    Math.floor(Date.now() / 1000),
                );
            }
        })();

        // ─── Generate PDF ────────────────────────────────────────────────────────
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        // Header bar
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('DELIVERY CHALLAN', 105, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(sellerName, 105, 20, { align: 'center' });

        // Challan meta
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`Challan No: ${challanNumber}`, 15, 38);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${dateStr}`, 15, 44);
        doc.text(`Type: ${challanType.charAt(0).toUpperCase() + challanType.slice(1)}`, 15, 50);

        // Customer details box
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(130, 33, 70, 30, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.text('To:', 134, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(orders[0].customer_name || 'N/A', 134, 46, { maxWidth: 62 });
        if (orders[0].customer_state) {
            doc.text(`State: ${orders[0].customer_state}`, 134, 52);
        }
        if (orders[0].customer_gstin) {
            doc.text(`GSTIN: ${orders[0].customer_gstin}`, 134, 58);
        }

        // Items table
        const tableBody = orders.map((o: any, idx: number) => [
            idx + 1,
            `#${String(o.id)}`,
            o.design_name || 'N/A',
            o.quantity_meters ? `${o.quantity_meters} m` : '—',
            o.price_per_unit ? `₹${parseFloat(o.price_per_unit).toFixed(2)}` : '—',
            o.total_price ? `₹${parseFloat(o.total_price).toLocaleString('en-IN')}` : '—',
        ]);

        autoTable(doc, {
            startY: 70,
            head: [['S.No', 'Order ID', 'Design', 'Quantity', 'Rate/m', 'Total']],
            body: tableBody,
            foot: [['', '', '', `${totalQty} m`, 'Grand Total', `₹${totalValue.toLocaleString('en-IN')}`]],
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 },
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
            columnStyles: { 0: { halign: 'center', cellWidth: 10 }, 3: { halign: 'center' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        });

        // Signature area
        const finalY = (doc as any).lastAutoTable.finalY + 20;
        doc.setDrawColor(203, 213, 225);
        doc.line(15, finalY + 15, 75, finalY + 15);
        doc.line(135, finalY + 15, 195, finalY + 15);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text("Receiver's Signature", 45, finalY + 20, { align: 'center' });
        doc.text('Authorized Signatory', 165, finalY + 20, { align: 'center' });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generated by FabricOS • ${challanNumber} • ${dateStr}`, 105, 285, { align: 'center' });

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Challan_${challanNumber}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Challan generation error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
