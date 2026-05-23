import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { sendTelegramMessage } from '@/lib/telegram';
import { buildDailySummaryTemplate, ReceivableItem, PayableItem } from '@/lib/telegram-templates';

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { authorized, error, status } = await checkPermission('settings.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const body = await request.json();
        const { 
            type = 'alert',
            simulateFail = false,
            simulateOverdue = false,
            simulateEmpty = false,
            simulateLargeAmount = false,
            simulatePartial = false
        } = body;

        if (simulateFail) {
            throw new Error('Telegram blocked recipient (Simulated Delivery Failure)');
        }

        const db = getDatabase();
        
        // Fetch recipient with language settings
        const recipient = (await db.prepare(`SELECT telegram_chat_id, role, preferred_language FROM telegram_recipients WHERE id = ?`).get(params.id)) as any;
        
        if (!recipient) {
            return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
        }

        const roleDefaultsMap: Record<string, string> = {};
        const roleRows = (await db.prepare("SELECT key, value FROM settings WHERE key LIKE 'role_lang_default_%'").all()) as any[];
        roleRows.forEach(row => {
            const roleName = row.key.replace('role_lang_default_', '');
            roleDefaultsMap[roleName] = row.value;
        });

        let lang = recipient.preferred_language;
        if (!lang || lang === 'role_default') {
            lang = roleDefaultsMap[recipient.role] || 'english';
        }

        const isGuj = lang === 'gujarati';

        let message = isGuj ? '🔔 *FabricOS પરીક્ષણ ચેતવણી*\n\nતમારું ટેલિગ્રામ કનેક્શન યોગ્ય રીતે કામ કરી રહ્યું છે તે ચકાસવા માટે આ એક પરીક્ષણ સૂચના છે.' : '🔔 *FabricOS Test Alert*\n\nThis is a test notification to verify your Telegram connection is working correctly.';
        
        if (type === 'daily_payments') {
            const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
            
            let mockReceivables: ReceivableItem[] = [];
            let mockPayables: PayableItem[] = [];
            let totalReceivable = 0;
            let totalPayable = 0;

            if (simulateEmpty) {
                // Empty state
            } else if (simulateOverdue) {
                mockReceivables = [
                    { customerName: 'Karan Textiles', orderNumber: 'ORD-2026-0042', pendingAmount: 34600 },
                    { customerName: 'Aditya Hub', orderNumber: 'ORD-2026-0051', pendingAmount: 15300 }
                ];
                mockPayables = [
                    { vendorName: 'Vishal Dye Works', pendingAmount: 18000 }
                ];
                totalReceivable = 49900;
                totalPayable = 18000;
            } else {
                mockReceivables = [
                    { customerName: 'Rajesh Textiles', orderNumber: 'ORD-2026-0042', pendingAmount: 48000 },
                    { customerName: 'Priya Fabrics', orderNumber: 'ORD-2026-0051', pendingAmount: 32500 }
                ];
                mockPayables = [
                    { vendorName: 'Vishal Dye Works', pendingAmount: 18000 },
                    { vendorName: 'Raj Embroidery', pendingAmount: 12500 }
                ];
                totalReceivable = 80500;
                totalPayable = 30500;
            }

            const payload = buildDailySummaryTemplate({
                dateStr,
                receivables: mockReceivables,
                payables: mockPayables,
                totalReceivable,
                totalPayable
            });
            
            message = isGuj ? payload.gujarati : payload.english;
        } else if (type === 'weekly_summary') {
            if (simulateEmpty) {
                message = isGuj ? '📊 *FabricOS — સાપ્તાહિક સારાંશ*\n\nઓર્ડર: 0\nઆવક: ₹0\nખર્ચ: ₹0\n*ચોખ્ખી રોકડ*: ₹0' : '📊 *FabricOS — Weekly Summary*\n\nOrders: 0\nRevenue: ₹0\nExpenses: ₹0\n*Net Cash*: ₹0';
            } else if (simulateLargeAmount) {
                message = isGuj ? '📊 *FabricOS — સાપ્તાહિક સારાંશ*\n\nઓર્ડર: 42\nઆવક: ₹12,45,000\nખર્ચ: ₹2,10,000\n*ચોખ્ખી રોકડ*: ₹10,35,000' : '📊 *FabricOS — Weekly Summary*\n\nOrders: 42\nRevenue: ₹12,45,000\nExpenses: ₹2,10,000\n*Net Cash*: ₹10,35,000';
            } else {
                message = isGuj ? '📊 *FabricOS — સાપ્તાહિક સારાંશ*\n\nઓર્ડર: 7\nઆવક: ₹1,12,000\nખર્ચ: ₹28,500\n*ચોખ્ખી રોકડ*: ₹83,500' : '📊 *FabricOS — Weekly Summary*\n\nOrders: 7\nRevenue: ₹1,12,000\nExpenses: ₹28,500\n*Net Cash*: ₹83,500';
            }
        } else if (type === 'monthly_summary') {
            if (simulateEmpty) {
                message = isGuj ? '📄 *FabricOS — માસિક સારાંશ રિપોર્ટ*\n\nછેલ્લા મહિનામાં કોઈ કામગીરી નોંધાઈ નથી.' : '📄 *FabricOS — Monthly Summary Report*\n\nNo operations recorded in the last month.';
            } else {
                message = isGuj ? '📄 *FabricOS — માસિક સારાંશ રિપોર્ટ*\n\nમે 2026 નાણાકીય મેટ્રિક્સ:\n• કુલ આવક: ₹4,80,000\n• કુલ ખર્ચ: ₹1,20,000\n• સક્રિય ઓર્ડર: 28\n• ઉત્પાદન ઉપજ: 94%' : '📄 *FabricOS — Monthly Summary Report*\n\nMay 2026 Financial metrics:\n• Total Revenue: ₹4,80,000\n• Total Expenses: ₹1,20,000\n• Active Orders: 28\n• Production Yield: 94%';
            }
        } else if (type === 'attendance') {
            if (simulateEmpty) {
                message = isGuj ? '⏰ *FabricOS — હાજરી રીમાઇન્ડર*\n\nતમામ કર્મચારીઓની હાજરી નોંધાઈ ગઈ છે. કોઈ પેન્ડિંગ નથી.' : '⏰ *FabricOS — Attendance Reminder*\n\nAll employee timesheets submitted. No pending logs.';
            } else {
                message = isGuj ? '⏰ *FabricOS — હાજરી રીમાઇન્ડર*\n\n*ધ્યાન આપો*: નીચેના કર્મચારીઓએ આજે હાજરી નોંધાવી નથી:\n• રોહન ગુપ્તા\n• મીરા સેન\n\nકૃપા કરીને સાંજે 06:00 પહેલાં હાજરી નોંધાઈ જાય તેની ખાતરી કરો.' : '⏰ *FabricOS — Attendance Reminder*\n\n*Attention*: The following employees have not marked attendance today:\n• Rohan Gupta\n• Meera Sen\n\nPlease ensure timesheets are logged before 06:00 PM.';
            }
        } else if (type === 'new_order') {
            if (simulateLargeAmount) {
                message = isGuj ? '📥 *FabricOS — નવો ઓર્ડર એલર્ટ*\n\nઓર્ડર #ORD-2026-901 બુક કરવામાં આવ્યો છે.\n*ગ્રાહક*: VIP Client Corp\n*વસ્તુઓ*: સિલ્ક પેસલી (500m)\n*કુલ મૂલ્ય*: ₹2,25,000' : '📥 *FabricOS — New Order Alert*\n\nOrder #ORD-2026-901 has been booked.\n*Customer*: VIP Client Corp\n*Items*: Silk Paisley (500m)\n*Total Value*: ₹2,25,000';
            } else {
                message = isGuj ? '📥 *FabricOS — નવો ઓર્ડર એલર્ટ*\n\nઓર્ડર #ORD-2026-889 બુક કરવામાં આવ્યો છે.\n*ગ્રાહક*: પ્રિયા શર્મા\n*વસ્તુઓ*: લિનન સ્ટ્રાઇપ્સ (40m)\n*કુલ મૂલ્ય*: ₹10,000' : '📥 *FabricOS — New Order Alert*\n\nOrder #ORD-2026-889 has been booked.\n*Customer*: Priya Sharma\n*Items*: Linen Stripes (40m)\n*Total Value*: ₹10,000';
            }
        } else if (type === 'payment_received') {
            if (simulatePartial) {
                message = isGuj ? '💸 *FabricOS — ચૂકવણી પ્રાપ્ત થઈ*\n\nરાજેશ કુમાર માટે *આંશિક ચૂકવણી* નોંધાઈ.\nબિલ રકમ: ₹15,000\n*પ્રાપ્ત*: ₹7,500\nબાકી: ₹7,500\n*પદ્ધતિ*: UPI' : '💸 *FabricOS — Payment Received*\n\n*Partial payment* logged for Rajesh Kumar.\nInvoice Amount: ₹15,000\n*Received*: ₹7,500\nRemaining: ₹7,500\n*Method*: UPI';
            } else {
                message = isGuj ? '💸 *FabricOS — ચૂકવણી પ્રાપ્ત થઈ*\n\nરાજેશ કુમાર માટે *સંપૂર્ણ ચૂકવણી* નોંધાઈ.\nરકમ: ₹15,000\n*પદ્ધતિ*: UPI\n*સંદર્ભ*: Ref-9928371' : '💸 *FabricOS — Payment Received*\n\n*Full payment* logged for Rajesh Kumar.\nAmount: ₹15,000\n*Method*: UPI\n*Reference*: Ref-9928371';
            }
        } else if (type === 'order_dispatched') {
            message = isGuj ? '🚚 *FabricOS — ઓર્ડર રવાના થયો*\n\nઓર્ડર #ORD-2026-889 ડિલિવરી માટે રવાના કરવામાં આવ્યો છે.\n*ગ્રાહક*: પ્રિયા શર્મા\n*ડિઝાઇન*: લિનન સ્ટ્રાઇપ્સ (40m)\n*કુરિયર પાર્ટનર*: બ્લુ ડાર્ટ\n*ટ્રેકિંગ ID*: BD-8837190' : '🚚 *FabricOS — Order Dispatched*\n\nOrder #ORD-2026-889 has been dispatched for delivery.\n*Customer*: Priya Sharma\n*Design*: Linen Stripes (40m)\n*Courier Partner*: Blue Dart\n*Tracking ID*: BD-8837190';
        } else if (type === 'vendor_payment') {
            message = isGuj ? '⚠️ *FabricOS — વિક્રેતા ચૂકવણી એલર્ટ*\n\nટેક્સટાઇલ સપ્લાયર્સ લિમિટેડને આગામી ચૂકવણી 2 દિવસમાં બાકી છે.\n*રકમ*: ₹50,000\n*નિયત તારીખ*: 2026-05-21\n*વર્તમાન બાકી*: ₹75,000' : '⚠️ *FabricOS — Vendor Payment Alert*\n\nUpcoming payment due to Textile Suppliers Ltd in 2 days.\n*Amount*: ₹50,000\n*Due Date*: 2026-05-21\n*Current Balance*: ₹75,000';
        } else if (type === 'salary_paid') {
            message = isGuj ? '💵 *FabricOS — પગાર ચૂકવવામાં આવ્યો*\n\nમે 2026 માટેનો પગાર પ્રક્રિયા કરવામાં આવ્યો છે.\n*કર્મચારી*: સ્ટાફ યુઝર\nમૂળ પગાર: ₹20,000\nઓવરટાઇમ: ₹2,500\nકપાત: ₹0\n*ચૂકવેલ ચોખ્ખી રકમ*: ₹22,500\n*સંદર્ભ*: Sal-998877' : '💵 *FabricOS — Salary Disbursed*\n\nSalary for May 2026 has been processed.\n*Employee*: Staff User\nBasic Pay: ₹20,000\nOvertime: ₹2,500\nDeductions: ₹0\n*Net Paid*: ₹22,500\n*Reference*: Sal-998877';
        } else if (type === 'expense_added') {
            message = isGuj ? '📝 *FabricOS — ખર્ચ નોંધાયો*\n\nનવો ખર્ચ નોંધવામાં આવ્યો છે.\n*કેટેગરી*: કાચો માલ\n*રકમ*: ₹25,000\n*દ્વારા નોંધાયેલ*: એડમિન યુઝર\n*નોંધ*: કપાસની ખરીદી\n*લિંક કરેલ ID*: EXP-77291' : '📝 *FabricOS — Expense Logged*\n\nNew expense recorded.\n*Category*: Raw Material\n*Amount*: ₹25,000\n*Logged by*: Admin User\n*Notes*: Cotton purchase\n*Linked ID*: EXP-77291';
        }

        // We use the internal direct API to send specifically to THIS chat ID
        const botTokenRow = (await db.prepare("SELECT value FROM settings WHERE key = 'telegram_bot_token'").get()) as any;
        const botToken = botTokenRow?.value || process.env.TELEGRAM_BOT_TOKEN;
        
        if (!botToken) {
            return NextResponse.json({ error: 'Telegram Bot Token is not configured' }, { status: 400 });
        }

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: recipient.telegram_chat_id,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Telegram API Error: ${errBody}`);
        }

        // Log success
        (await db.prepare(`
            INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status)
            VALUES (?, ?, 'delivered')
        `).run(params.id, type));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('API Error:', err);
        
        // Log failure
        try {
            const db = getDatabase();
            (await db.prepare(`
                INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
                VALUES (?, ?, 'failed', ?)
            `).run(params.id, 'test', err.message));
        } catch (e) {}

        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
