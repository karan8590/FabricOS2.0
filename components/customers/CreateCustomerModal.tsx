'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Phone, Mail, MapPin, FileText, Hash, AlertTriangle } from 'lucide-react';
import styles from './CreateCustomerModal.module.css';
import { GST_STATES, validateGSTIN } from '@/lib/gst';

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customer?: any; // If provided, the modal acts in "Edit" mode
}

export default function CreateCustomerModal({ isOpen, onClose, onSuccess, customer }: CreateCustomerModalProps) {
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [customerType, setCustomerType] = useState('B2C');
    const [gstin, setGstin] = useState('');
    const [state, setState] = useState('');
    const [stateCode, setStateCode] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setError('');
            
            if (customer) {
                setName(customer.name || '');
                setPhone(customer.phone || '');
                // Try parsing metadata if any, or default
                setCustomerType(customer.customer_type || 'B2C');
                setGstin(customer.gstin || '');
                setState(customer.state || '');
                setStateCode(customer.state_code || '');
            } else {
                resetForm();
            }

            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                window.removeEventListener('keydown', handleEsc);
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen, onClose, customer]);

    const resetForm = () => {
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setCustomerType('B2C');
        setGstin('');
        setState('');
        setStateCode('');
        setNotes('');
        setError('');
    };

    const handleStateChange = (stateName: string) => {
        setState(stateName);
        const code = GST_STATES.find(s => s.name === stateName)?.code || '';
        setStateCode(code);
        
        // Auto-fix GSTIN state prefix if they already typed one
        if (gstin && gstin.length >= 2 && code) {
            setGstin(code + gstin.substring(2));
        }
    };

    const handleSubmit = async () => {
        if (!name.trim() || !phone.trim()) {
            setError('Customer name and phone number are required');
            return;
        }

        if (customerType === 'B2B') {
            if (!gstin.trim()) {
                setError('GSTIN is required for B2B customers');
                return;
            }
            if (!state) {
                setError('State is required for B2B customers');
                return;
            }
            const validation = validateGSTIN(gstin, stateCode);
            if (!validation.valid) {
                setError(validation.error || 'Invalid GSTIN');
                return;
            }
        }

        setLoading(true);
        setError('');
        
        const payload = {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            customer_type: customerType,
            gstin: customerType === 'B2B' ? gstin.trim().toUpperCase() : null,
            state: customerType === 'B2B' ? state : null,
            state_code: customerType === 'B2B' ? stateCode : null,
            notes: notes.trim()
        };

        try {
            const url = customer ? `/api/customers/${customer.id}` : '/api/customers';
            const method = customer ? 'PATCH' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                onSuccess();
                onClose();
                if (!customer) resetForm();
            } else {
                const data = await res.json();
                setError(data.error || `Failed to ${customer ? 'update' : 'add'} customer`);
            }
        } catch (err) {
            console.error('Customer save error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.panel} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className={styles.headerIcon}>
                            <User size={20} />
                        </div>
                        <div>
                            <h2 className={styles.title}>{customer ? 'Edit Customer Details' : 'Add New Customer'}</h2>
                            <p className={styles.subtitle}>{customer ? 'Update customer profile information' : 'Register a new customer in the system'}</p>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {error && (
                        <div className={styles.errorBanner} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(255, 59, 48, 0.08)', border: '1px solid rgba(255, 59, 48, 0.2)', color: '#FF3B30', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', fontWeight: '500' }}>
                            <AlertTriangle size={16} style={{ shrink: 0 }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Section 1: Basic Info */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <User size={14} />
                            <span className={styles.sectionTitle}>Section 1: Basic Information</span>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <label className={styles.label}>Customer Name <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <User className={styles.inputIcon} size={16} />
                                    <input
                                        className={styles.input}
                                        placeholder="e.g. Aditya Textile Hub"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        autoFocus={!customer}
                                    />
                                </div>
                            </div>
                            <div className={styles.field}>
                                <label className={styles.label}>Phone Number <span className={styles.required}>*</span></label>
                                <div className={styles.inputWrapper}>
                                    <Phone className={styles.inputIcon} size={16} />
                                    <input
                                        className={styles.input}
                                        placeholder="+91XXXXXXXXXX"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        type="tel"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: GST & Billing Profile */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <Hash size={14} />
                            <span className={styles.sectionTitle}>Section 2: GST & Billing Profile</span>
                        </div>
                        <div className={styles.grid}>
                            <div className={styles.field}>
                                <label className={styles.label}>Customer Type</label>
                                <select 
                                    className={styles.input}
                                    style={{ paddingLeft: '12px' }}
                                    value={customerType}
                                    onChange={e => setCustomerType(e.target.value)}
                                >
                                    <option value="B2C">B2C (Retail / No GSTIN)</option>
                                    <option value="B2B">B2B (Business / GSTIN Required)</option>
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label className={styles.label}>Email Address</label>
                                <div className={styles.inputWrapper}>
                                    <Mail className={styles.inputIcon} size={16} />
                                    <input
                                        className={styles.input}
                                        placeholder="customer@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        type="email"
                                    />
                                </div>
                            </div>

                            {customerType === 'B2B' && (
                                <>
                                    <div className={styles.field}>
                                        <label className={styles.label}>Billing State</label>
                                        <select
                                            className={styles.input}
                                            style={{ paddingLeft: '12px' }}
                                            value={state}
                                            onChange={e => handleStateChange(e.target.value)}
                                        >
                                            <option value="">Select State</option>
                                            {GST_STATES.map(s => (
                                                <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>GSTIN (GST Number)</label>
                                        <div className={styles.inputWrapper}>
                                            <Hash className={styles.inputIcon} size={16} />
                                            <input
                                                className={styles.input}
                                                placeholder={`${stateCode || '24'}XXXXX1234X1ZX`}
                                                value={gstin}
                                                onChange={e => setGstin(e.target.value.toUpperCase())}
                                                maxLength={15}
                                                style={{ fontFamily: 'monospace' }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className={styles.field} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Business Address</label>
                                <div className={styles.inputWrapper}>
                                    <MapPin className={styles.inputIcon} size={16} />
                                    <input
                                        className={styles.input}
                                        placeholder="Full billing address"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Notes */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <FileText size={14} />
                            <span className={styles.sectionTitle}>Section 3: Additional Notes</span>
                        </div>
                        <div className={styles.field}>
                            <label className={styles.label}>Internal Notes</label>
                            <textarea
                                className={styles.textarea}
                                placeholder="Add any internal notes about this customer..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.cancelBtn} onClick={onClose} type="button">Cancel</button>
                    <button
                        className={styles.createBtn}
                        onClick={handleSubmit}
                        disabled={loading || !name.trim() || !phone.trim()}
                    >
                        {loading ? 'Saving...' : customer ? 'Save Changes' : 'Add Customer'}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
