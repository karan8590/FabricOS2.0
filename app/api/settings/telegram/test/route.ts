import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { checkPermission } from '@/lib/auth/permissions';
import { 
    buildDailySummaryTemplate, 
    buildPaymentReminderTemplate, 
    buildProductionUpdateTemplate, 
    buildOrderAlertTemplate,
    TelegramPayload
} from '@/lib/telegram-templates';
import { sendTelegramMessage } from '@/lib/telegram';

const getMockData = (type: string) => {
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    switch (type) {
        case 'daily_summary':
            return {
                dateStr: today,
                receivables: [
                    { customerName: 'Customer 1', orderNumber: 'ORD-2026-0041', pendingAmount: 45000 },
                    { customerName: 'Customer 2', orderNumber: 'ORD-2026-0042', pendingAmount: 28000 }
                ],
                payables: [
                    { vendorName: 'Vishal Dyeing', pendingAmount: 12000 }
                ],
                totalReceivable: 73000,
                totalPayable: 12000
            };
        case 'payment_reminder':
            return {
                invoiceNo: 'INV-2026-01',
                amount: 45000,
                daysOverdue: 3,
                customerName: 'Customer 1'
            };
        case 'production_update':
            return {
                orderNo: 'ORD-2026-0042',
                fabric: 'Cotton Silk',
                quantity: 1200,
                currentStatus: 'Printing',
                nextStep: 'Send to Dyeing',
                expectedDelivery: 'Next Friday'
            };
        case 'order_alert':
            return {
                statusLabel: { en: '🚀 *Order Dispatched*', guj: '🚀 *ઓર્ડર રવાના થયો*' },
                orderNo: 'ORD-2026-0042',
                customerName: 'Customer 2',
                designName: 'Floral Print',
                quantity: 1200,
                value: 28000
            };
        default:
            return null;
    }
};

const getTemplateForType = (type: string): TelegramPayload => {
    const data = getMockData(type);
    if (!data) return { english: 'Test message configuration not found.', gujarati: 'ટેસ્ટ મેસેજ કન્ફિગરેશન મળ્યું નથી.' };

    switch (type) {
        case 'daily_summary': return buildDailySummaryTemplate(data as any);
        case 'payment_reminder': return buildPaymentReminderTemplate(data as any);
        case 'production_update': return buildProductionUpdateTemplate(data as any);
        case 'order_alert': return buildOrderAlertTemplate(data as any);
        default: return { english: 'Test message', gujarati: 'ટેસ્ટ મેસેજ' };
    }
};

export async function POST(request: Request) {
    try {
        const { authorized, error, status, user } = await checkPermission('settings.edit');
        if (!authorized) return NextResponse.json({ error }, { status });

        const body = await request.json();
        const { action, messageType, recipientId, command } = body;
        const db = getDatabase();

        if (action === 'preview') {
            const preview = getTemplateForType(messageType);
            return NextResponse.json({ preview });
        }

        if (action === 'send') {
            // Validate inputs
            if (!messageType || !recipientId) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

            // Fetch recipient
            const recipient = (await db.prepare('SELECT * FROM telegram_recipients WHERE id = ?').get(recipientId)) as any;
            if (!recipient || !recipient.telegram_chat_id) {
                return NextResponse.json({ error: 'Recipient not found or missing chat ID' }, { status: 404 });
            }

            const payload = getTemplateForType(messageType);
            const language = recipient.preferred_language || 'english';
            const textToSend = language === 'gujarati' ? payload.gujarati : payload.english;

            // Optional: prepend a "Test Mode" flag
            const finalText = `🔧 *TEST MESSAGE*\n\n${textToSend}`;

            try {
                await sendTelegramMessage(recipient.telegram_chat_id, finalText);
                
                // Log success
                await db.prepare(`
                    INSERT INTO telegram_test_logs (business_id, recipient_id, message_type, status, error, sent_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(user?.businessId || 1, recipientId, messageType, 'delivered', null, Math.floor(Date.now() / 1000));

                return NextResponse.json({ success: true });
            } catch (sendErr: any) {
                // Log failure
                await db.prepare(`
                    INSERT INTO telegram_test_logs (business_id, recipient_id, message_type, status, error, sent_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(user?.businessId || 1, recipientId, messageType, 'failed', sendErr.message, Math.floor(Date.now() / 1000));
                
                return NextResponse.json({ error: sendErr.message }, { status: 500 });
            }
        }

        if (action === 'simulate-command') {
            if (!command) return NextResponse.json({ error: 'Missing command' }, { status: 400 });
            let response = '';
            
            // Very simple command simulation
            if (command.startsWith('/summary')) {
                response = 'Here is your summary for today: 5 Orders Pending, 2 Dispatched.';
            } else if (command.startsWith('/order')) {
                response = `Order ${command.split(' ')[1] || 'Unknown'} is currently in Printing phase.`;
            } else if (command.startsWith('/payment')) {
                response = `Payment reminder triggered for ${command.split(' ')[1] || 'Client'}.`;
            } else if (command.startsWith('/dispatch')) {
                response = `Dispatch tracking updated for ${command.split(' ')[1] || 'Order'}.`;
            } else {
                response = `Unrecognized command. Valid commands: /summary, /order, /payment, /dispatch.`;
            }

            return NextResponse.json({ response });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
