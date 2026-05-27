'use client';

import React, { useState } from 'react';
import { 
    ShoppingBag, FileText, CreditCard, 
    Activity, Clock, CheckCircle2, 
    AlertCircle, Phone, MessageCircle, 
    Plus, ChevronLeft, Calendar, 
    TrendingUp, ArrowRight, Package,
    Layers, Receipt, History, File, Edit, AlertTriangle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './CustomerWorkspace.module.css';
import OrdersTab from './OrdersTab';
import InvoicesTab from './InvoicesTab';
import PaymentsTab from './PaymentsTab';
import ActivityTab from './ActivityTab';
import OrdersTable from '@/components/orders/OrdersTable';
import CreateOrderPanel from '@/components/orders/CreateOrderPanel';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';

interface CustomerWorkspaceProps {
    data: any;
    onUpdate: () => void;
}

export default function CustomerWorkspace({ data, onUpdate }: CustomerWorkspaceProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('orders');
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const { customer, metrics, orders, invoices, payments, activity } = data;

    const formatCurrency = (val: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

    const tabs = [
        { id: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
        { id: 'invoices', label: 'Invoices', icon: <Receipt size={18} /> },
        { id: 'payments', label: 'Payments', icon: <CreditCard size={18} /> },
        { id: 'tracking', label: 'Tracking', icon: <Layers size={18} /> },
        { id: 'documents', label: 'Documents', icon: <File size={18} /> },
        { id: 'activity', label: 'Activity', icon: <History size={18} /> },
    ];

    const activeProduction = orders.filter((o: any) => 
        ['approved', 'in production', 'ready'].includes(o.status.toLowerCase())
    ).length;

    const lastPayment = payments.length > 0 ? payments[0] : null;

    const isIncompleteGST = !customer.customer_type || 
        (customer.customer_type === 'B2B' && (!customer.gstin || !customer.state || !customer.state_code));

    return (
        <div className={styles.container}>
            <button className={styles.backBtn} onClick={() => router.push('/customers')}>
                <ChevronLeft size={18} />
                <span>Back to Customers</span>
            </button>

            {isIncompleteGST && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    padding: '16px 24px',
                    backgroundColor: 'rgba(217, 119, 6, 0.06)',
                    border: '1px solid rgba(217, 119, 6, 0.15)',
                    borderRadius: '16px',
                    marginBottom: '24px',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(217, 119, 6, 0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#D97706',
                            flexShrink: 0
                        }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#78350F' }}>GST details incomplete</h4>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#92400E' }}>
                                Edit customer profile to add GSTIN, Billing State, and Customer Type details.
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#D97706',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                        }}
                    >
                        Edit Profile
                    </button>
                </div>
            )}

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.avatar}>
                        {customer.name.charAt(0)}
                    </div>
                    <div className={styles.customerInfo}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h1 className={styles.customerName}>{customer.name}</h1>
                            {customer.customer_type && (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    textTransform: 'uppercase',
                                    backgroundColor: customer.customer_type === 'B2B' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                                    color: customer.customer_type === 'B2B' ? '#4F46E5' : '#4B5563',
                                    border: `1px solid ${customer.customer_type === 'B2B' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(107, 114, 128, 0.2)'}`
                                }}>
                                    {customer.customer_type}
                                </span>
                            )}
                        </div>
                        <div className={styles.meta}>
                            <span>{customer.phone}</span>
                            <span className={styles.dot}>•</span>
                            <span>{customer.state ? `${customer.state} (${customer.state_code})` : (customer.category || 'Retailer')}</span>
                            <span className={styles.dot}>•</span>
                            <span>Joined {new Date(customer.created_at * 1000).toLocaleDateString()}</span>
                        </div>
                        <div className={styles.contactActions}>
                            <a href={`tel:${customer.phone}`} className={styles.contactBtn}>
                                <Phone size={14} />
                                <span>Call</span>
                            </a>
                            <a 
                                href={`https://wa.me/${customer.phone?.replace(/\D/g, '')}`} 
                                target="_blank" 
                                className={`${styles.contactBtn} ${styles.whatsapp}`}
                            >
                                <MessageCircle size={14} />
                                <span>WhatsApp</span>
                            </a>
                            <button 
                                className={styles.contactBtn}
                                onClick={() => setIsEditModalOpen(true)}
                            >
                                <Edit size={14} />
                                <span>Edit Profile</span>
                            </button>
                            <button 
                                className={`${styles.contactBtn} ${styles.addOrderBtn}`}
                                onClick={() => setIsCreateOrderOpen(true)}
                            >
                                <Plus size={14} />
                                <span>Add Order</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.metricsGrid}>
                        <div className={styles.metricCard}>
                            <span className={styles.metricLabel}>Pending Amount</span>
                            <span className={`${styles.metricValue} ${styles.due}`}>
                                {formatCurrency(metrics.outstandingDue)}
                            </span>
                        </div>
                        <div className={styles.metricCard}>
                            <span className={styles.metricLabel}>Lifetime Value</span>
                            <span className={`${styles.metricValue} ${styles.paid}`}>
                                {formatCurrency(metrics.lifetimeRevenue)}
                            </span>
                        </div>
                        <div className={`${styles.metricCard} ${styles.riskCard}`}>
                            <span className={styles.metricLabel}>Risk Assessment</span>
                            <span className={`${styles.riskBadge} ${styles[customer.behavior?.replace(' ', '') || 'New']}`}>
                                {customer.behavior || 'New'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className={styles.summaryWidgets}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'rgba(175, 82, 222, 0.1)', color: '#AF52DE' }}>
                        <ShoppingBag size={20} />
                    </div>
                    <div className={styles.summaryData}>
                        <span className={styles.summaryLabel}>Total Orders</span>
                        <span className={styles.summaryValue}>{metrics.totalOrders}</span>
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34C759' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div className={styles.summaryData}>
                        <span className={styles.summaryLabel}>Total Revenue</span>
                        <span className={styles.summaryValue}>{formatCurrency(metrics.lifetimeRevenue)}</span>
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#FF3B30' }}>
                        <AlertCircle size={20} />
                    </div>
                    <div className={styles.summaryData}>
                        <span className={styles.summaryLabel}>Pending Amount</span>
                        <span className={styles.summaryValue}>{formatCurrency(metrics.outstandingDue)}</span>
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}>
                        <Activity size={20} />
                    </div>
                    <div className={styles.summaryData}>
                        <span className={styles.summaryLabel}>Active Production</span>
                        <span className={styles.summaryValue}>{activeProduction}</span>
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'rgba(52, 199, 89, 0.1)', color: '#34C759' }}>
                        <CreditCard size={20} />
                    </div>
                    <div className={styles.summaryData}>
                        <span className={styles.summaryLabel}>Last Payment</span>
                        <span className={styles.summaryValue}>
                            {lastPayment ? formatCurrency(lastPayment.amount) : 'No payments'}
                        </span>
                        {lastPayment && (
                            <span className={styles.summarySubValue}>
                                {new Date(lastPayment.payment_date * 1000).toLocaleDateString()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <nav className={styles.tabsNav}>
                <div className={styles.tabsList}>
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`${styles.tabTrigger} ${activeTab === tab.id ? styles.active : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            <main className={styles.tabContent}>
                {activeTab === 'orders' && (
                    <OrdersTable 
                        orders={orders} 
                        onUpdate={onUpdate}
                        onGenerateInvoice={() => {}} 
                        activeWidget={null}
                    />
                )}
                {activeTab === 'invoices' && (
                    <InvoicesTab invoices={invoices} customer={customer} onUpdate={onUpdate} />
                )}
                {activeTab === 'payments' && (
                    <PaymentsTab payments={payments} />
                )}
                {activeTab === 'tracking' && (
                    <div className={styles.error}>Order tracking features are active under individual orders.</div>
                )}
                {activeTab === 'documents' && (
                    <div className={styles.error}>No documents uploaded yet.</div>
                )}
                {activeTab === 'activity' && (
                    <ActivityTab activity={activity} />
                )}
            </main>

            <CreateOrderPanel 
                isOpen={isCreateOrderOpen}
                onClose={() => setIsCreateOrderOpen(false)}
                onSuccess={() => {
                    onUpdate();
                    setIsCreateOrderOpen(false);
                }}
                initialCustomerId={customer.id}
            />
        </div>
    );
}
