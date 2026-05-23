'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './Login.module.css';

export default function LoginPage() {
    const [countryCode, setCountryCode] = useState('+91');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const loginId = phone.includes('@') ? phone : `${countryCode}${phone}`;
            const loggedInUser = await login(loginId, password);
            if (loggedInUser.isSuperAdmin) {
                router.push('/super-admin');
            } else if (loggedInUser.role === 'customer' && loggedInUser.customerId) {
                router.push(`/customers/${loggedInUser.customerId}`);
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginContainer}>
                <div className={styles.logo}>
                    <h1 className={styles.logoText}>FabricOS</h1>
                    <p className={styles.logoSubtext}>
                        Textile Manufacturing Management
                    </p>
                </div>

                <div className={styles.loginCard}>
                    <h2 className={styles.title}>Welcome Back</h2>
                    <p className={styles.subtitle}>Sign in to your account</p>

                    {error && <div className={styles.error}>{error}</div>}

                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>Phone Number or Email</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!phone.includes('@') && (
                                    <select 
                                        value={countryCode} 
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#1e293b', fontSize: '14px', outline: 'none', cursor: 'pointer' }}
                                    >
                                        <option value="+91">+91 (IN)</option>
                                        <option value="+1">+1 (US)</option>
                                        <option value="+44">+44 (UK)</option>
                                        <option value="+971">+971 (AE)</option>
                                    </select>
                                )}
                                <input
                                    type={phone.includes('@') ? "email" : "text"}
                                    required
                                    maxLength={phone.includes('@') ? undefined : 10}
                                    pattern={phone.includes('@') ? undefined : "\\d{10}"}
                                    title={phone.includes('@') ? undefined : "Please enter exactly 10 digits"}
                                    placeholder={phone.includes('@') ? "admin@example.com" : "9999999999"}
                                    value={phone}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.includes('@') || /[a-zA-Z]/.test(val)) {
                                            setPhone(val);
                                        } else {
                                            const digitsOnly = val.replace(/[^\d@.]/g, '');
                                            setPhone(digitsOnly.slice(0, 10)); // Force 10 chars max
                                        }
                                    }}
                                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <Input
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    <div className={styles.divider}>
                        <span>New customer?</span>
                    </div>

                    <Link href="/signup" style={{ textDecoration: 'none' }}>
                        <Button variant="ghost" fullWidth>
                            Create Account
                        </Button>
                    </Link>

                    <div className={styles.demoCredentials}>
                        <p className={styles.demoTitle}>Demo Credentials</p>
                        <ul className={styles.demoList}>
                            <li>
                                Admin: <code>+919999999999</code> / <code>admin123</code>
                            </li>
                            <li>
                                Staff: <code>+919999999998</code> / <code>staff123</code>
                            </li>
                            <li>
                                Customer: <code>+919999999991</code> / <code>customer123</code>
                            </li>
                        </ul>
                    </div>
                </div>

                <p className={styles.footer}>
                    © 2026 FabricOS. Premium Textile Management.
                </p>
            </div>
        </div>
    );
}
