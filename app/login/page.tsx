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
                        <div className={styles.inputGroup}>
                            <label className={styles.inputLabel}>Phone Number or Email</label>
                            <div className={styles.phoneInputContainer}>
                                {!phone.includes('@') && (
                                    <select 
                                        value={countryCode} 
                                        onChange={(e) => setCountryCode(e.target.value)}
                                        className={styles.countrySelect}
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
                                    className={styles.phoneInput}
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
                        <span className={styles.dividerText}>New to FabricOS?</span>
                    </div>

                    <Link href="/signup" style={{ textDecoration: 'none' }}>
                        <Button variant="ghost" fullWidth className={styles.createAccountBtn}>
                            Create an Account
                        </Button>
                    </Link>
                </div>

                <p className={styles.footer}>
                    © 2026 FabricOS. Premium Textile Management.
                </p>
            </div>
        </div>
    );
}
