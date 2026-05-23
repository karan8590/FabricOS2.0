'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { MessageCircle, Phone, Mail, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import styles from '../CustomerPortal.module.css';

export default function CustomerSupportPage() {
    const { id } = useParams();
    const [customer, setCustomer] = useState<any>(null);

    useEffect(() => {
        fetch(`/api/customers/${id}`).then(res => res.json()).then(data => setCustomer(data));
    }, [id]);

    const handleWhatsApp = () => {
        const adminPhone = '919999999999'; // Admin/Support contact
        const message = `Hi, I'm ${customer?.name || 'a customer'}. I need support with my order on FabricOS.`;
        window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    return (
        <div className={styles.portalPage}>
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Support Center</h1>
                <p className={styles.pageSubtitle}>We are here to help you with your manufacturing needs</p>
            </header>

            <div className={styles.supportGrid}>
                <div className={styles.supportCard}>
                    <div className={`${styles.supportIcon} ${styles.whatsapp}`}>
                        <MessageCircle size={32} />
                    </div>
                    <h3 className={styles.supportTitle}>Chat on WhatsApp</h3>
                    <p className={styles.supportText}>Get instant updates and resolve queries quickly.</p>
                    <Button variant="primary" fullWidth onClick={handleWhatsApp}>Open WhatsApp</Button>
                </div>

                <div className={styles.supportCard}>
                    <div className={styles.supportIcon}>
                        <Phone size={32} />
                    </div>
                    <h3 className={styles.supportTitle}>Call Us</h3>
                    <p className={styles.supportText}>Direct line for urgent production issues.</p>
                    <Button variant="ghost" fullWidth onClick={() => window.location.href = 'tel:+919999999999'}>+91 99999 99999</Button>
                </div>

                <div className={styles.supportCard}>
                    <div className={styles.supportIcon}>
                        <Mail size={32} />
                    </div>
                    <h3 className={styles.supportTitle}>Email Support</h3>
                    <p className={styles.supportText}>For detailed documentation and queries.</p>
                    <Button variant="ghost" fullWidth onClick={() => window.location.href = 'mailto:support@fabricos.com'}>support@fabricos.com</Button>
                </div>
            </div>

            <div className={styles.businessHours}>
                <div className={styles.hoursIcon}><Clock size={20} /></div>
                <div>
                    <h4 className={styles.hoursTitle}>Business Hours</h4>
                    <p className={styles.hoursText}>Mon - Sat: 9:00 AM - 7:00 PM IST</p>
                </div>
            </div>
        </div>
    );
}
