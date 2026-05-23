import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import styles from './EmployeeModal.module.css';

interface EmployeeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    employee?: any;
    currentUserRole: string;
}

export default function EmployeeModal({ isOpen, onClose, onSave, employee, currentUserRole }: EmployeeModalProps) {
    const isEdit = !!employee;
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        role: 'staff',
        isActive: true,
        canLogin: true,
        password: '',
        monthlySalary: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (employee) {
                setFormData({
                    name: employee.name,
                    phone: employee.phone,
                    email: employee.email || '',
                    role: employee.role,
                    isActive: employee.is_active === 1,
                    canLogin: employee.can_login === 1,
                    password: '',
                    monthlySalary: employee.monthlySalary !== undefined ? String(employee.monthlySalary) : '0',
                });
            } else {
                setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    role: 'staff',
                    isActive: true,
                    canLogin: true,
                    password: '',
                    monthlySalary: '',
                });
            }
            setError('');
        }
    }, [isOpen, employee]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }));
    };

    const handleRoleSelect = (role: string) => {
        setFormData(prev => ({ ...prev, role }));
    };

    const generatePassword = () => {
        const chars = 'abcdefDEFGH23456789!@#';
        let pass = '';
        for (let i = 0; i < 8; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, password: pass }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.name || !formData.phone) {
            setError('Name and Phone are required.');
            setLoading(false);
            return;
        }

        // If canLogin is true, password is required for new users
        if (!isEdit && formData.canLogin && !formData.password) {
            setError('Password is required when login access is enabled.');
            setLoading(false);
            return;
        }

        try {
            await onSave(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save employee.');
        } finally {
            setLoading(false);
        }
    };

    const roleOptions = [
        { value: 'admin', label: 'Admin', color: '#0A84FF', desc: 'Full system access' },
        { value: 'manager', label: 'Manager', color: '#AF52DE', desc: 'Manage orders & staff' },
        { value: 'staff', label: 'Staff', color: '#8E8E93', desc: 'Limited access' },
    ];

    const availableRoles = currentUserRole === 'manager'
        ? roleOptions.filter(r => r.value !== 'admin')
        : roleOptions;

    const getRolePermissions = (role: string) => {
        switch (role) {
            case 'admin':
                return ['Full System Access', 'Manage Employees', 'Manage Roles', 'Override Approvals', 'View All Data'];
            case 'manager':
                return ['View Dashboard', 'Create & Approve Orders', 'Manage Customers', 'View & Pay Invoices', 'Manage Catalog', 'View Vendors', 'View Expenses'];
            case 'staff':
                return ['View Dashboard', 'Create Orders', 'View Catalog', 'View Customers', 'View Invoices'];
            default:
                return [];
        }
    };

    // Permissions
    // Manager cannot edit Admin
    const isEditingAdmin = isEdit && employee?.role === 'admin';
    const canEditThisUser = currentUserRole === 'admin' || (currentUserRole === 'manager' && !isEditingAdmin);

    if (!canEditThisUser && isEdit) {
        // Should not happen as parent filters, but safety fallback
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit Access Control' : 'Add Employee'}>
            <form onSubmit={handleSubmit} className={styles.form}>
                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.sectionTitle}>Basic Info</div>
                <div className={styles.fieldGroup}>
                    <label>Full Name</label>
                    <Input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. John Doe" />
                </div>
                <div className={styles.row}>
                    <div className={styles.fieldGroup}>
                        <label>Phone</label>
                        <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="+91..." />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label>Email (Optional)</label>
                        <Input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" />
                    </div>
                </div>

                <div className={styles.fieldGroup}>
                    <label>Monthly Salary (₹)</label>
                    <Input name="monthlySalary" type="number" value={formData.monthlySalary} onChange={handleChange} placeholder="e.g. 25000" min="0" />
                </div>

                <div className={styles.divider} />
                <div className={styles.sectionTitle}>Access Control</div>

                <div className={styles.fieldGroup}>
                    <label>Role Assignment</label>
                    <div className={styles.roleSelector}>
                        {availableRoles.map((role) => (
                            <button
                                key={role.value}
                                type="button"
                                className={`${styles.roleBtn} ${formData.role === role.value ? styles.roleBtnActive : ''}`}
                                onClick={() => handleRoleSelect(role.value)}
                                style={{ '--role-color': role.color } as React.CSSProperties}
                            >
                                <span className={styles.roleLabel}>{role.label}</span>
                                <span className={styles.roleDesc}>{role.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.accessPreview}>
                    <div className={styles.previewTitle}>Effective Access</div>
                    <div className={styles.previewGrid}>
                        {getRolePermissions(formData.role).map((perm, i) => (
                            <div key={i} className={styles.previewItem}>
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className={styles.checkIcon}>
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>{perm}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.togglesRow}>
                    <div className={styles.toggleGroup}>
                        <label className={styles.switch}>
                            <input type="checkbox" name="canLogin" checked={formData.canLogin} onChange={handleChange} />
                            <span className={styles.slider}></span>
                        </label>
                        <div className={styles.toggleText}>
                            <span className={styles.toggleTitle}>Login Access</span>
                            <span className={styles.toggleSubtitle}>Allow signing in</span>
                        </div>
                    </div>

                    <div className={styles.toggleGroup}>
                        <label className={styles.switch}>
                            <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
                            <span className={styles.slider}></span>
                        </label>
                        <div className={styles.toggleText}>
                            <span className={styles.toggleTitle}>Account Status</span>
                            <span className={styles.toggleSubtitle}>{formData.isActive ? 'Active' : 'Disabled'}</span>
                        </div>
                    </div>
                </div>

                {formData.canLogin && (
                    <div className={styles.passwordSection}>
                        <div className={styles.fieldGroup}>
                            <div className={styles.labelRow}>
                                <label>{isEdit ? 'Reset Password' : 'Password'}</label>
                                <span className={styles.autoGen} onClick={generatePassword}>Auto-generate</span>
                            </div>
                            <Input
                                name="password"
                                type="text"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder={isEdit ? 'Leave empty to keep unchanged' : 'Required'}
                            />
                            {formData.password && (
                                <p className={styles.passwordHint}>Make sure to copy this password.</p>
                            )}
                        </div>
                    </div>
                )}

                <div className={styles.actions}>
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" disabled={loading}>
                        {loading ? 'Saving...' : (isEdit ? 'Update Access' : 'Create Employee')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
