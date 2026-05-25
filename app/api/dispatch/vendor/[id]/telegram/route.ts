import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { getActiveBusinessId } from '@/lib/auth/business';
import { generateVendorChallanPDFServer, VendorChallanPDFData } from '@/lib/pdf/generateVendorChallanServer';
import { sendTelegramDocument } from '@/lib/telegram';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('orders.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const businessId = await getActiveBusinessId();
        if (!businessId) return NextResponse.json({ error: 'Unauthorized business access' }, { status: 401 });

        const challanId = parseInt(params.id);
        if (!challanId) return NextResponse.json({ error: 'Invalid challan ID' }, { status: 400 });

        const db = getDatabase();

        const challan = await db.prepare(`
            SELECT vd.*, v.name as vendor_name, v.contact as vendor_phone, 
                   o.order_number, d.name as design_name, o.fabric_type
            FROM vendor_dispatches vd
            JOIN vendors v ON vd.vendor_id = v.id
            JOIN orders o ON vd.order_id = o.id
            JOIN designs d ON o.design_id = d.id
            WHERE vd.id = ? AND vd.business_id = ?
        `).get(challanId, businessId) as any;

        if (!challan) {
            return NextResponse.json({ error: 'Challan not found' }, { status: 404 });
        }

        const business = (await db.prepare(`
            SELECT name, phone, gst_number as gstin, address, logo_url
            FROM businesses
            WHERE id = ?
        `).get(businessId)) as any;

        const pdfData: VendorChallanPDFData = {
            dispatch_number: challan.dispatch_number,
            sent_date: challan.sent_date,
            vendor_name: challan.vendor_name,
            vendor_phone: challan.vendor_phone,
            process_type: challan.process_type,
            order_number: challan.order_number,
            design_name: challan.design_name,
            fabric_type: challan.fabric_type,
            quantity: challan.total_meters,
            rate_per_meter: challan.rate_per_meter,
            total_cost: challan.total_cost,
            expected_return_date: challan.expected_return_date,
            notes: challan.notes,
            seller_name: business?.name,
            seller_phone: business?.phone,
            seller_gstin: business?.gstin,
            seller_address: business?.address,
            seller_logo: business?.logo_url
        };

        const { buffer } = await generateVendorChallanPDFServer(pdfData);

        const expDate = challan.expected_return_date 
            ? new Date(challan.expected_return_date * 1000).toLocaleDateString('en-US') 
            : 'Unknown';

        let tgTemplate = {};
        if (challan.process_type === 'embroidery') {
            tgTemplate = {
                english: `🪡 #${challan.order_number} → Embroidery — ${challan.total_meters}m back by ${expDate}`,
                gujarati: `🪡 #${challan.order_number} → ભરતકામ — ${challan.total_meters}m ${expDate} સુધીમાં પરત`
            };
        } else {
            tgTemplate = {
                english: `🎨 #${challan.order_number} → Dyeing — ${challan.total_meters}m back by ${expDate}`,
                gujarati: `🎨 #${challan.order_number} → ડાઇંગ — ${challan.total_meters}m ${expDate} સુધીમાં પરત`
            };
        }
            
        const telegramSent = await sendTelegramDocument(
            buffer, 
            `${challan.dispatch_number}.pdf`, 
            tgTemplate,
            'vendor_alerts'
        );

        if (telegramSent) {
            await db.prepare('UPDATE vendor_dispatches SET telegram_sent = 1 WHERE id = ?').run(challanId);
            return NextResponse.json({ success: true, message: 'Challan resent successfully' });
        } else {
            return NextResponse.json({ error: 'Failed to send Telegram message' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Vendor Challan Telegram API Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
