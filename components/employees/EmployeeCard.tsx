import styles from './EmployeeCard.module.css';

interface EmployeeCardProps {
    employee: any;
    currentUserRole: string; // 'admin' | 'manager'
    onEdit: (employee: any) => void;
}

export default function EmployeeCard({ employee, currentUserRole, onEdit }: EmployeeCardProps) {

    // Role styling
    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'admin': return styles.roleAdmin;
            case 'manager': return styles.roleManager;
            default: return styles.roleStaff;
        }
    };

    const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

    // Manager cannot edit Admin
    const canEdit = currentUserRole === 'admin' || (currentUserRole === 'manager' && employee.role !== 'admin');

    const canLogin = employee.can_login === 1;
    const isActive = employee.is_active === 1;

    return (
        <div className={`${styles.card} ${!isActive ? styles.inactive : ''}`}>
            <div className={styles.leftSection}>
                <div className={styles.avatar}>
                    {employee.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.info}>
                    <h3 className={styles.name}>{employee.name}</h3>
                    <div className={styles.metaRow}>
                        <span className={`${styles.roleBadge} ${getRoleBadgeStyle(employee.role)}`}>
                            {formatRole(employee.role)}
                        </span>
                        {!canLogin && (
                            <span className={styles.statusBadgeWarning}>
                                Login Disabled
                            </span>
                        )}
                        {!isActive && (
                            <span className={styles.statusBadgeInactive}>
                                Account Inactive
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className={styles.centerSection}>
                <div className={styles.activityRow}>
                    <span className={styles.label}>Last Login</span>
                    <span className={styles.value}>
                        {employee.last_login
                            ? new Date(employee.last_login * 1000).toLocaleDateString()
                            : 'Never'}
                    </span>
                </div>
            </div>

            <div className={styles.rightSection}>
                {canEdit && (
                    <button
                        className={styles.editBtn}
                        onClick={() => onEdit(employee)}
                        aria-label="Edit Employee"
                    >
                        Edit
                    </button>
                )}
            </div>
        </div>
    );
}
