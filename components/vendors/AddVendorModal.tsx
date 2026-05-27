'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, Truck, Package, Scissors, Building2, Layers, CheckCircle2, Loader2 } from 'lucide-react';
import styles from './AddVendorModal.module.css';

interface AddVendorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type VendorType = 'Fabric Supplier' | 'Job Work' | 'transport' | 'Packaging Supplier' | 'Other' | null;

export default function AddVendorModal({ isOpen, onClose, onSuccess }: AddVendorModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [vendorType, setVendorType] = useState<VendorType>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Common fields
    const [businessName, setBusinessName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [phone, setPhone] = useState('');
    const [altPhone, setAltPhone] = useState('');
    const [email, setEmail] = useState('');
    const [gst, setGst] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    // Specific fields
    const [fabricTypes, setFabricTypes] = useState<string[]>(['Polyester']);
    const [workCategory, setWorkCategory] = useState('Embroidery'); // Embroidery, Dyeing, Printing, Stitching, Packaging
    const [driverName, setDriverName] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [route, setRoute] = useState('');

    const resetForm = () => {
        setStep(1);
        setVendorType(null);
        setBusinessName('');
        setOwnerName('');
        setPhone('');
        setAltPhone('');
        setEmail('');
        setGst('');
        setAddress('');
        setNotes('');
        setFabricTypes(['Polyester']);
        setWorkCategory('Embroidery');
        setDriverName('');
        setVehicleNumber('');
        setVehicleType('');
        setRoute('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSelectType = (type: VendorType) => {
        setVendorType(type);
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Map our state to the API expected payload
            let materialSupplied = '';
            
            if (vendorType === 'Fabric Supplier') {
                materialSupplied = fabricTypes.join(', ') || 'Fabric';
            } else if (vendorType === 'Job Work') {
                materialSupplied = workCategory;
            } else if (vendorType === 'transport') {
                materialSupplied = 'Transport Services';
            } else if (vendorType === 'Packaging Supplier') {
                materialSupplied = 'Packaging';
            } else {
                materialSupplied = 'Other';
            }

            const payload = {
                name: businessName,
                ownerName: ownerName,
                contact: phone,
                altPhone: altPhone,
                email: email,
                materialSupplied,
                balance: 0,
                vendorType: vendorType,
                gstNo: gst,
                address: address,
                notes: notes + (ownerName ? `\nOwner: ${ownerName}` : ''),
                status: 'active',
                vehicleNumber: vendorType === 'transport' ? vehicleNumber : null,
                driverName: vendorType === 'transport' ? (driverName || businessName) : null,
                vehicleType: vendorType === 'transport' ? vehicleType : null,
                defaultRoute: vendorType === 'transport' ? route : null,
            };

            const res = await fetch('/api/vendors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                resetForm();
                onSuccess();
            } else {
                const data = await res.json();
                console.log(data.error || 'Failed to create vendor');
            }
        } catch (error) {
            console.error('Error creating vendor:', error);
            console.log('An error occurred while creating vendor');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderStep1 = () => (
        <div className={styles.formContainer}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Vendor Type</h3>
                <p className={styles.sectionSubtitle}>Select the category that best describes this new partner.</p>
            </div>
            <div className={styles.cardGrid}>
                <div 
                    className={`${styles.typeCard} ${vendorType === 'Fabric Supplier' ? styles.typeCardActive : ''}`}
                    onClick={() => handleSelectType('Fabric Supplier')}
                >
                    <div className={styles.cardIcon}><Layers size={24} strokeWidth={1.5} /></div>
                    <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>Fabric Supplier</h3>
                        <p className={styles.cardDesc}>Raw fabric procurement</p>
                    </div>
                </div>
                
                <div 
                    className={`${styles.typeCard} ${vendorType === 'Job Work' ? styles.typeCardActive : ''}`}
                    onClick={() => handleSelectType('Job Work')}
                >
                    <div className={styles.cardIcon}><Scissors size={24} strokeWidth={1.5} /></div>
                    <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>Job Work</h3>
                        <p className={styles.cardDesc}>Embroidery, Dyeing, Stitching</p>
                    </div>
                </div>

                <div 
                    className={`${styles.typeCard} ${vendorType === 'transport' ? styles.typeCardActive : ''}`}
                    onClick={() => handleSelectType('transport')}
                >
                    <div className={styles.cardIcon}><Truck size={24} strokeWidth={1.5} /></div>
                    <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>Transport</h3>
                        <p className={styles.cardDesc}>Tempo, Driver, Logistics</p>
                    </div>
                </div>

                <div 
                    className={`${styles.typeCard} ${vendorType === 'Packaging Supplier' ? styles.typeCardActive : ''}`}
                    onClick={() => handleSelectType('Packaging Supplier')}
                >
                    <div className={styles.cardIcon}><Package size={24} strokeWidth={1.5} /></div>
                    <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>Packaging</h3>
                        <p className={styles.cardDesc}>Boxes, Bags, Tape</p>
                    </div>
                </div>

                <div 
                    className={`${styles.typeCard} ${vendorType === 'Other' ? styles.typeCardActive : ''}`}
                    onClick={() => handleSelectType('Other')}
                >
                    <div className={styles.cardIcon}><Building2 size={24} strokeWidth={1.5} /></div>
                    <div className={styles.cardContent}>
                        <h3 className={styles.cardTitle}>Other Vendor</h3>
                        <p className={styles.cardDesc}>General business suppliers</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => {
        return (
            <form onSubmit={handleSubmit} className={styles.formContainer}>
                <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className={styles.backBtn}
                >
                    <ChevronLeft size={16} /> Back to Selection
                </button>

                {vendorType === 'Fabric Supplier' && (
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <h4 className={styles.sectionTitle}>Fabric Supplier Details</h4>
                            <p className={styles.sectionSubtitle}>Enter the primary business details for this fabric vendor.</p>
                        </div>
                        <div className={styles.formGrid}>
                            <div className={styles.formField}>
                                <label className={styles.label}>Business Name <span className={styles.requiredStar}>*</span></label>
                                <input className={styles.input} required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Surat Textiles" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Owner Name</label>
                                <input className={styles.input} value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="e.g. Rahul bhai" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Phone Number <span className={styles.requiredStar}>*</span></label>
                                <input className={styles.input} required type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" />
                            </div>
                            <div className={styles.formField} style={{ gridColumn: 'span 2' }}>
                                <label className={styles.label}>Fabric Specialization</label>
                                <div className={styles.chipsGrid}>
                                    {['Polyester', 'Viscose', 'Cotton', 'Silk Blend', 'Georgette'].map((type) => {
                                        const isSelected = fabricTypes.includes(type);
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setFabricTypes(fabricTypes.filter(t => t !== type));
                                                    } else {
                                                        setFabricTypes([...fabricTypes, type]);
                                                    }
                                                }}
                                            >
                                                <span className={styles.chipCheckbox}>
                                                    {isSelected ? '✓' : ''}
                                                </span>
                                                {type}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>GST Number</label>
                                <input className={styles.input} value={gst} onChange={e => setGst(e.target.value.toUpperCase())} placeholder="15-digit GSTIN" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Email Address</label>
                                <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@business.com" />
                            </div>
                            <div className={`${styles.formField} ${styles.fullWidth}`}>
                                <label className={styles.label}>Full Address</label>
                                <textarea className={styles.textarea} value={address} onChange={e => setAddress(e.target.value)} placeholder="Building, Street, Area, City" rows={2} />
                            </div>
                        </div>
                    </div>
                )}

                {vendorType === 'Job Work' && (
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <h4 className={styles.sectionTitle}>Job Work Details</h4>
                            <p className={styles.sectionSubtitle}>Register an outsourced service provider.</p>
                        </div>
                        <div className={styles.formGrid}>
                            <div className={styles.formField}>
                                <label className={styles.label}>Vendor Name <span className={styles.requiredStar}>*</span></label>
                                <input className={styles.input} required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Laxmi Embroidery" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Work Category <span className={styles.requiredStar}>*</span></label>
                                <select className={styles.select} required value={workCategory} onChange={e => setWorkCategory(e.target.value)}>
                                    <option value="Embroidery">Embroidery</option>
                                    <option value="Dyeing">Dyeing</option>
                                    <option value="Printing">Printing</option>
                                    <option value="Stitching">Stitching</option>
                                    <option value="Packaging">Packaging Services</option>
                                </select>
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Phone Number <span className={styles.requiredStar}>*</span></label>
                                <input className={styles.input} required type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>GST Number</label>
                                <input className={styles.input} value={gst} onChange={e => setGst(e.target.value.toUpperCase())} placeholder="15-digit GSTIN" />
                            </div>
                            <div className={`${styles.formField} ${styles.fullWidth}`}>
                                <label className={styles.label}>Full Address</label>
                                <textarea className={styles.textarea} value={address} onChange={e => setAddress(e.target.value)} placeholder="Building, Street, Area, City" rows={2} />
                            </div>
                        </div>
                    </div>
                )}

                {vendorType === 'transport' && (
                    <>
                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <h4 className={styles.sectionTitle}>Transport Details</h4>
                                <p className={styles.sectionSubtitle}>Logistics partner for dispatching orders.</p>
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label className={styles.label}>Company / Driver Name <span className={styles.requiredStar}>*</span></label>
                                    <input className={styles.input} required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Shree Ram Tempo" />
                                </div>
                                <div className={styles.formField}>
                                    <label className={styles.label}>Driver Name (if different)</label>
                                    <input className={styles.input} value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="e.g. Ramesh" />
                                </div>
                                <div className={styles.formField}>
                                    <label className={styles.label}>Mobile Number <span className={styles.requiredStar}>*</span></label>
                                    <input className={styles.input} required type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Primary Contact" />
                                </div>
                                <div className={styles.formField}>
                                    <label className={styles.label}>Alternate Number</label>
                                    <input className={styles.input} type="tel" inputMode="tel" value={altPhone} onChange={e => setAltPhone(e.target.value)} placeholder="Emergency Contact" />
                                </div>
                            </div>
                        </div>

                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <h4 className={styles.sectionTitle}>Vehicle & Route</h4>
                                <p className={styles.sectionSubtitle}>Used for auto-filling dispatch challans.</p>
                            </div>
                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label className={styles.label}>Vehicle Number</label>
                                    <input className={styles.input} value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} placeholder="GJ 05 AB 1234" />
                                </div>
                                <div className={styles.formField}>
                                    <label className={styles.label}>Vehicle Type</label>
                                    <select className={styles.select} value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
                                        <option value="">Select Type</option>
                                        <option value="tempo">Tempo</option>
                                        <option value="pickup">Pickup</option>
                                        <option value="truck">Truck</option>
                                        <option value="mini_truck">Mini Truck</option>
                                    </select>
                                </div>
                                <div className={`${styles.formField} ${styles.fullWidth}`}>
                                    <label className={styles.label}>Default Route / Area</label>
                                    <input className={styles.input} value={route} onChange={e => setRoute(e.target.value)} placeholder="e.g. Ring Road, Surat" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {(vendorType === 'Packaging Supplier' || vendorType === 'Other') && (
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <h4 className={styles.sectionTitle}>Business Details</h4>
                            <p className={styles.sectionSubtitle}>Enter basic vendor information.</p>
                        </div>
                        <div className={styles.formGrid}>
                            <div className={styles.formField}>
                                <label className={styles.label}>Business Name <span className={styles.requiredStar}>*</span></label>
                                <input className={styles.input} required value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Business Name" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Phone Number <span className={styles.requiredStar}>*</span></label>
                                <input className={styles.input} required type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="10-digit number" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>GST Number</label>
                                <input className={styles.input} value={gst} onChange={e => setGst(e.target.value.toUpperCase())} placeholder="15-digit GSTIN" />
                            </div>
                            <div className={styles.formField}>
                                <label className={styles.label}>Email Address</label>
                                <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@business.com" />
                            </div>
                            <div className={`${styles.formField} ${styles.fullWidth}`}>
                                <label className={styles.label}>Full Address</label>
                                <textarea className={styles.textarea} value={address} onChange={e => setAddress(e.target.value)} placeholder="Building, Street, Area, City" rows={2} />
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.formSection}>
                    <div className={styles.sectionHeader}>
                        <h4 className={styles.sectionTitle}>Optional Settings</h4>
                    </div>
                    <div className={styles.formGrid}>
                        <div className={`${styles.formField} ${styles.fullWidth}`}>
                            <label className={styles.label}>Internal Notes</label>
                            <textarea className={styles.textarea} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any specific requirements or notes..." rows={2} />
                        </div>
                    </div>
                </div>
            </form>
        );
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modalContainer} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitleGroup}>
                        <h2 className={styles.modalTitle}>Add New Vendor</h2>
                        <p className={styles.modalSubtitle}>Register a new business partner to the system</p>
                    </div>
                    <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {step === 1 ? renderStep1() : renderStep2()}
                </div>

                {step === 2 && (
                    <div className={styles.footer}>
                        <button type="button" className={styles.cancelBtn} onClick={handleClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={16} strokeWidth={2.5} />
                                    Save Vendor
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
