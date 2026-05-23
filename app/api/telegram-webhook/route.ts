import { NextResponse } from 'next/server';
import getDatabase from '@/lib/db';
import { sendMessageToChat } from '@/lib/telegram';
import { logAction } from '@/lib/auditLogger';

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Ensure we received a message with text
        if (!body.message || !body.message.text) {
            return NextResponse.json({ success: true });
        }

        const chatId = body.message.chat.id;
        const text = body.message.text.trim();
        const username = body.message.from.username || body.message.from.first_name || 'User';

        const db = getDatabase();

        // Optional: Check if chatId is authorized (present in telegram_recipients)
        const recipient = (await db.prepare('SELECT id, role, recipient_name FROM telegram_recipients WHERE telegram_chat_id = ? AND is_active = 1').get(chatId)) as any;
        
        if (!recipient) {
            await sendMessageToChat(chatId, "⚠️ Unauthorized. Your chat ID is not registered in FabricOS.");
            return NextResponse.json({ success: true });
        }

        // Log the interaction
        (await db.prepare(`
            INSERT INTO telegram_notification_logs (recipient_id, notification_type, delivery_status, error_message)
            VALUES (?, 'webhook_incoming', 'delivered', ?)
        `).run(recipient.id, `Command received: ${text}`));

        // Parse Commands
        const parts = text.split(' ');
        const command = parts[0].toLowerCase();

        if (command === '/summary') {
            // Today's summary
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startOfDay = Math.floor(today.getTime() / 1000);
            
            const salesRow = (await db.prepare('SELECT SUM(total_price) as sum FROM orders WHERE created_at >= ?').get(startOfDay)) as any;
            const paymentsRow = (await db.prepare('SELECT SUM(amount) as sum FROM expenses WHERE date >= ? AND category = "Payment Received"').get(startOfDay)) as any;
            const activeOrdersRow = (await db.prepare('SELECT COUNT(*) as count FROM orders WHERE status NOT IN ("delivered", "completed", "cancelled")').get()) as any;

            const sales = salesRow?.sum || 0;
            const payments = paymentsRow?.sum || 0;
            const active = activeOrdersRow?.count || 0;

            const reply = `📊 *Today's Summary*\n\n💰 Sales: ₹${sales.toLocaleString('en-IN')}\n💵 Payments: ₹${payments.toLocaleString('en-IN')}\n📦 Active Orders: ${active}`;
            await sendMessageToChat(chatId, reply);
            return NextResponse.json({ success: true });
        }

        if (command === '/attend') {
            const today = new Date().toISOString().split('T')[0];
            // Admin attendance, map recipient to user or just log generic
            (await db.prepare(`
                INSERT INTO attendance (business_id, employee_id, date, status, notes)
                VALUES (1, (SELECT id FROM users WHERE role IN ('admin', 'superadmin') LIMIT 1), ?, 'present', ?)
                ON CONFLICT(employee_id, date) DO UPDATE SET status = 'present'
            `).run(today, `Attendance via Telegram by ${username}`));
            
            await sendMessageToChat(chatId, `✅ Attendance marked present for today (${today}).`);
            return NextResponse.json({ success: true });
        }

        if (command === '/status') {
            const orderNo = parts[1];
            if (!orderNo) {
                await sendMessageToChat(chatId, "⚠️ Please provide an order number. Example: `/status 1042`");
                return NextResponse.json({ success: true });
            }

            const order = (await db.prepare(`
                SELECT o.*, c.name as customer_name
                FROM orders o
                JOIN customers c ON o.customer_id = c.id
                WHERE o.order_number = ? OR o.id = ?
            `).get(orderNo, orderNo)) as any;

            if (order) {
                const reply = `📦 *Order Details*\n\n*Order No*: ${order.order_number}\n*Customer*: ${order.customer_name}\n*Status*: ${order.status.toUpperCase()}\n*Value*: ₹${order.total_price.toLocaleString('en-IN')}\n*Quantity*: ${order.quantity_meters}m`;
                await sendMessageToChat(chatId, reply);
            } else {
                await sendMessageToChat(chatId, `❌ Order ${orderNo} not found.`);
            }
            return NextResponse.json({ success: true });
        }

        if (command === 'paid') {
            const invoiceNo = parts[1];
            const amount = parseFloat(parts[2]);

            if (!invoiceNo || isNaN(amount)) {
                await sendMessageToChat(chatId, "⚠️ Invalid format. Example: `PAID INV-2023-0010 50000`");
                return NextResponse.json({ success: true });
            }

            const invoice = (await db.prepare('SELECT id, amount, amount_paid, status, customer_id, business_id FROM invoices WHERE invoice_number = ?').get(invoiceNo)) as any;
            
            if (invoice) {
                const newPaid = (invoice.amount_paid || 0) + amount;
                const newStatus = newPaid >= invoice.amount ? 'paid' : 'partially_paid';

                (await db.prepare('UPDATE invoices SET amount_paid = ?, status = ? WHERE id = ?').run(newPaid, newStatus, invoice.id));
                
                // Update customer outstanding balance (reduce by amount paid)
                (await db.prepare('UPDATE customers SET outstanding_amount = outstanding_amount - ? WHERE id = ?').run(amount, invoice.customer_id));

                // Add to expenses as payment received
                (await db.prepare(`
                    INSERT INTO expenses (business_id, category, amount, date, description, paymentMode, isAuto)
                    VALUES (?, 'Payment Received', ?, ?, ?, 'Bank Transfer', 1)
                `).run(invoice.business_id, amount, Math.floor(Date.now() / 1000), `Payment for ${invoiceNo} via Telegram`));

                // Audit log
                await logAction({
                    userId: 'telegram_bot',
                    userName: username,
                    userRole: recipient.role,
                    action: 'pay_invoice',
                    entity: 'invoice',
                    entityId: invoice.id.toString(),
                    changes: { amountPaid: amount, invoiceNumber: invoiceNo, method: 'telegram' }
                });

                await sendMessageToChat(chatId, `✅ *Payment Recorded*\n\nInvoice: ${invoiceNo}\nAmount: ₹${amount.toLocaleString('en-IN')}\nNew Status: ${newStatus.toUpperCase()}`);
            } else {
                await sendMessageToChat(chatId, `❌ Invoice ${invoiceNo} not found.`);
            }
            return NextResponse.json({ success: true });
        }

        // Unrecognized command
        await sendMessageToChat(chatId, "❓ Unrecognized command. Available commands:\n`/summary`\n`/attend`\n`/status [orderNo]`\n`PAID [invoiceNo] [amount]`");
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Telegram Webhook error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
