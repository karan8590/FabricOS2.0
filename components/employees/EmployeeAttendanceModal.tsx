import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import styles from './EmployeeAttendanceModal.module.css';

interface Employee {
    id: number;
    name: string;
    role: string;
}

interface AttendanceRecord {
    date: string;
    status: 'present' | 'absent' | 'half_day';
}

interface EmployeeAttendanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    employee: Employee;
    month: string; // YYYY-MM
}

export default function EmployeeAttendanceModal({ isOpen, onClose, employee, month }: EmployeeAttendanceModalProps) {
    const [mounted, setMounted] = useState(false);
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen && employee && month) {
            setLoading(true);
            fetch(`/api/attendance?month=${month}&employeeId=${employee.id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.records) {
                        setRecords(data.records);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, employee, month]);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!mounted) return null;

    // Parse month
    const [yearStr, monthStr] = month.split('-');
    const yearNum = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10) - 1; // 0-indexed

    const daysInMonth = new Date(yearNum, monthNum + 1, 0).getDate();
    const firstDayOfWeek = new Date(yearNum, monthNum, 1).getDay(); // 0 = Sunday

    const presentDays = records.filter(r => r.status === 'present' || r.status === 'half_day').length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const totalLogged = presentDays + absentDays;
    const attendancePercentage = totalLogged > 0 ? Math.round((presentDays / totalLogged) * 100) : 0;

    const todayStr = (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    })();

    const formatRole = (role: string) => {
        if (!role) return '';
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const monthName = new Date(yearNum, monthNum).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Build calendar grid
    const blanks = Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`blank-${i}`} className={`${styles.calendarCell} ${styles.empty}`} />);

    const days = Array.from({ length: daysInMonth }).map((_, i) => {
        const dayNum = i + 1;
        const dateStr = `${yearStr}-${monthStr}-${String(dayNum).padStart(2, '0')}`;
        const record = records.find(r => r.date === dateStr);
        
        const isFuture = dateStr > todayStr;
        const isToday = dateStr === todayStr;

        let cellClass = styles.calendarCell;
        let dotClass = null;

        if (record?.status === 'present' || record?.status === 'half_day') {
            cellClass += ` ${styles.present}`;
            dotClass = styles.present;
        } else if (record?.status === 'absent') {
            cellClass += ` ${styles.absent}`;
            dotClass = styles.absent;
        } else if (isFuture) {
            cellClass += ` ${styles.future}`;
        }

        if (isToday) {
            cellClass += ` ${styles.today}`;
        }

        return (
            <div key={`day-${dayNum}`} className={cellClass}>
                <span className={styles.dateNumber}>{dayNum}</span>
                <div className={styles.statusIndicator}>
                    {dotClass && <div className={`${styles.statusDot} ${dotClass}`} />}
                </div>
            </div>
        );
    });

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.backdrop} onClick={onClose}>
                    <motion.div 
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                        <div className={styles.header}>
                            <div className={styles.headerLeft}>
                                <div className={styles.avatar}>
                                    {employee.name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.employeeInfo}>
                                    <h3 className={styles.employeeName}>{employee.name}</h3>
                                    <div>
                                        <span className={styles.roleBadge}>{formatRole(employee.role)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={styles.headerRight}>
                                <span style={{ fontWeight: 500, color: '#4b5563' }}>{monthName}</span>
                                <button className={styles.closeButton} onClick={onClose}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className={styles.content}>
                            <div className={styles.statsGrid}>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Present</span>
                                    <span className={`${styles.statValue} ${styles.present}`}>{presentDays}</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Absent</span>
                                    <span className={`${styles.statValue} ${styles.absent}`}>{absentDays}</span>
                                </div>
                                <div className={styles.statCard}>
                                    <span className={styles.statLabel}>Attendance</span>
                                    <span className={`${styles.statValue} ${styles.percentage}`}>{attendancePercentage}%</span>
                                </div>
                            </div>

                            <div className={styles.calendarContainer}>
                                <div className={styles.calendarGrid}>
                                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                        <div key={d} className={styles.calendarHeader}>{d}</div>
                                    ))}
                                    {blanks}
                                    {days}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
}
