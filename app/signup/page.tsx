'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from '../login/Login.module.css';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login, refresh } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, password }),
            });

            const data = await res.json();

            if (res.ok) {
                // Refresh auth state to set the user role
                await refresh();
                
                // Get the updated user from context logic is tricky here because refresh() 
                // updates the state asynchronously. 
                // However, we can use the data from the signup response directly.
                if (data.user?.role === 'customer' && data.user?.customerId) {
                    router.push(`/customers/${data.user.customerId}`);
                } else {
                    router.push('/orders');
                }
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch (err: any) {
            setError(err.message || 'Signup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.loginPage}>
            <div className={styles.loginCard}>
                <div className={styles.logoSection}>
                    <h1 className={styles.logo}>FabricOS</h1>
                    <p className={styles.tagline}>Create your account</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.loginForm}>
                    {error && <div className={styles.error}>{error}</div>}

                    <Input
                        label="Full Name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your name"
                        required
                    />

                    <Input
                        label="Phone Number"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91XXXXXXXXXX"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="large"
                        fullWidth
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>

                    <div className={styles.divider}>
                        <span>Already have an account?</span>
                    </div>

                    <Link href="/login" style={{ textDecoration: 'none' }}>
                        <Button variant="ghost" size="large" fullWidth>
                            Sign In
                        </Button>
                    </Link>
                </form>

                <div className={styles.footer}>
                    <p>By signing up, you agree to browse our catalog and place orders.</p>
                </div>
            </div>
        </div>
    );
}
