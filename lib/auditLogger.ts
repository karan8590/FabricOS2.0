import getDatabase from './db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth/jwt';

interface AuditLogEntry {
    userId?: string;
    userName?: string;
    userRole?: string;
    action: string;
    entity: string;
    entityId?: string;
    entityLabel?: string;
    changes?: any;
    metadata?: any;
    businessId?: string;
}

export async function logAction(entry: AuditLogEntry) {
    try {
        let businessId = entry.businessId;
        let userId = entry.userId;
        let userName = entry.userName;
        let userRole = entry.userRole;

        // Auto-extract user details from JWT if not explicitly provided
        if (!businessId || !userId) {
            try {
                const cookieStore = await cookies();
                const token = cookieStore.get('auth-token')?.value;
                if (token) {
                    const decoded = verifyToken(token);
                    if (decoded) {
                        businessId = businessId || decoded.businessId;
                        userId = userId || (decoded.id || decoded.customerId)?.toString();
                        userName = userName || decoded.name;
                        userRole = userRole || decoded.role;
                    }
                }
            } catch (e) {
                // Ignore cookie parsing errors in background jobs
            }
        }

        // Fallback to default if not in a tenant context (e.g., cron jobs)
        businessId = businessId || 'business_001';

        const db = getDatabase();
        const now = Math.floor(Date.now() / 1000);

        const stmt = db.prepare(`
            INSERT INTO audit_logs (
                business_id, user_id, user_name, user_role, action, entity, entity_id, entity_label, changes, metadata, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `);

        // Perform the insert asynchronously
        await stmt.run(
            businessId,
            userId || null,
            userName || 'System',
            userRole || 'system',
            entry.action,
            entry.entity,
            entry.entityId || null,
            entry.entityLabel || null,
            entry.changes ? JSON.stringify(entry.changes) : null,
            entry.metadata ? JSON.stringify(entry.metadata) : null,
            now
        );
    } catch (error) {
        // Fail silently so we don't break the main business logic
        console.error('Audit logger error:', error);
    }
}
