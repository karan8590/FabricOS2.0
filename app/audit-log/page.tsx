'use client';

import React, { useState, useEffect } from 'react';
import { Search, Download, ShieldAlert, Calendar, RefreshCw } from 'lucide-react';
import styles from './AuditLog.module.css';
import Input from '@/components/ui/Input';
import ActivityTimeline from '@/components/ui/ActivityTimeline';

export default function AuditLogPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [entity, setEntity] = useState('all');
    const [action, setAction] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'timeline'>('timeline');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalLogs, setTotalLogs] = useState(0);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (entity !== 'all') params.set('entity', entity);
            if (action !== 'all') params.set('action', action);
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);
            params.set('page', page.toString());

            const res = await fetch(`/api/audit-logs?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setTotalPages(data.totalPages || 1);
                setTotalLogs(data.total || data.logs?.length || 0);
            }
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs();
        }, 300);
        return () => clearTimeout(timer);
    }, [search, entity, action, dateFrom, dateTo, page]);

    const handleExportCSV = () => {
        if (logs.length === 0) return;
        const headers = ['Date', 'User', 'Role', 'Action', 'Entity', 'Entity Label', 'Entity ID', 'Changes'];
        const csvContent = [
            headers.join(','),
            ...logs.map(log => {
                const date = new Date(log.timestamp * 1000).toLocaleString();
                const changes = JSON.stringify(log.changes || {}).replace(/"/g, '""');
                return `"${date}","${log.user_name}","${log.user_role}","${log.action}","${log.entity}","${log.entity_label || ''}","${log.entity_id || ''}","${changes}"`;
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_log_${new Date().getTime()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clearFilters = () => {
        setSearch('');
        setEntity('all');
        setAction('all');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const getActionBadgeStyle = (act: string) => {
        const map: Record<string, { bg: string; color: string }> = {
            create: { bg: '#eff6ff', color: '#1d4ed8' },
            update: { bg: '#fef3c7', color: '#b45309' },
            delete: { bg: '#fef2f2', color: '#b91c1c' },
            status_change: { bg: '#f5f3ff', color: '#6d28d9' },
            payment: { bg: '#f0fdfa', color: '#0f766e' },
            approve: { bg: '#ecfdf5', color: '#047857' },
            dispatch: { bg: '#eef2ff', color: '#4338ca' },
        };
        return map[act?.toLowerCase()] || { bg: '#f3f4f6', color: '#374151' };
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        <ShieldAlert size={26} style={{ display: 'inline', marginRight: '10px', verticalAlign: 'middle' }} />
                        Audit Log
                    </h1>
                    <p className={styles.subtitle}>
                        Full audit trail of all critical actions across FabricOS.
                        {totalLogs > 0 && <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>{totalLogs.toLocaleString()} events found</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className={styles.viewToggle} onClick={() => setViewMode(viewMode === 'table' ? 'timeline' : 'table')}>
                        {viewMode === 'table' ? '⏱ Timeline View' : '📋 Table View'}
                    </button>
                    <button className={styles.exportBtn} onClick={handleExportCSV}>
                        <Download size={15} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.controlsRow}>
                <div className={styles.searchWrapper}>
                    <Input
                        placeholder="Search by user, action, entity..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        icon={<Search size={16} />}
                    />
                </div>

                <select className={styles.filterSelect} value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }}>
                    <option value="all">All Modules</option>
                    <option value="order">Orders</option>
                    <option value="invoice">Invoices</option>
                    <option value="vendor_payment">Vendor Payments</option>
                    <option value="customer">Customers</option>
                    <option value="employee">Employees</option>
                    <option value="settings">Settings</option>
                    <option value="user">Users</option>
                </select>

                <select className={styles.filterSelect} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
                    <option value="all">All Actions</option>
                    <option value="create">Create</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="status_change">Status Change</option>
                    <option value="payment">Payment</option>
                    <option value="approve">Approve</option>
                    <option value="dispatch">Dispatch</option>
                </select>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Calendar size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                    <input
                        type="date"
                        className={styles.filterSelect}
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        title="From date"
                        style={{ maxWidth: '140px' }}
                    />
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>to</span>
                    <input
                        type="date"
                        className={styles.filterSelect}
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        title="To date"
                        style={{ maxWidth: '140px' }}
                    />
                </div>

                {(search || entity !== 'all' || action !== 'all' || dateFrom || dateTo) && (
                    <button className={styles.clearBtn} onClick={clearFilters}>
                        <RefreshCw size={14} /> Clear
                    </button>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className={styles.loading}>Loading audit logs...</div>
            ) : logs.length === 0 ? (
                <div className={styles.emptyState}>
                    <ShieldAlert size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p>No audit events found matching your criteria.</p>
                </div>
            ) : viewMode === 'timeline' ? (
                <div className={styles.timelineWrapper}>
                    <ActivityTimeline logs={logs} />
                </div>
            ) : (
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>User</th>
                                <th>Action</th>
                                <th>Module</th>
                                <th>Entity</th>
                                <th>Changes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, index) => {
                                const badgeStyle = getActionBadgeStyle(log.action);
                                return (
                                    <tr key={index}>
                                        <td style={{ whiteSpace: 'nowrap', fontSize: '13px', color: 'var(--text-secondary)' }}>
                                            {new Date(log.timestamp * 1000).toLocaleString('en-IN', {
                                                month: 'short', day: 'numeric', year: 'numeric',
                                                hour: 'numeric', minute: '2-digit'
                                            })}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{log.user_name || 'System'}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{log.user_role}</div>
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                                                textTransform: 'capitalize', background: badgeStyle.bg, color: badgeStyle.color
                                            }}>
                                                {log.action?.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td style={{ textTransform: 'capitalize', fontWeight: 500 }}>{log.entity?.replace(/_/g, ' ')}</td>
                                        <td>
                                            <div style={{ fontWeight: 500, fontSize: '13px' }}>{log.entity_label || `ID: ${log.entity_id || '—'}`}</div>
                                            {log.entity_id && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>#{log.entity_id}</div>}
                                        </td>
                                        <td>
                                            {log.changes ? (
                                                <pre className={styles.changesPre}>
                                                    {typeof log.changes === 'string'
                                                        ? JSON.stringify(JSON.parse(log.changes), null, 2)
                                                        : JSON.stringify(log.changes, null, 2)
                                                    }
                                                </pre>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                        ← Previous
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        Page {page} of {totalPages}
                    </span>
                    <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}
