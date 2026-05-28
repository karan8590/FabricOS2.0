'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import styles from './AttendanceTab.module.css';
import MonthPicker from '@/components/ui/MonthPicker';
import EmployeeAttendanceModal from './EmployeeAttendanceModal';

interface Employee {
    id: number;
    name: string;
    phone: string;
    role: string;
    is_active: number;
}

interface AttendanceRecord {
    employeeId: number;
    name: string;
    role: string;
    status: 'present' | 'absent' | 'unselected';
}

interface AttendanceTabProps {
    employees: Employee[];
}

export default function AttendanceTab({ employees }: AttendanceTabProps) {
    const getTodayString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getCurrentMonthString = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const getStartOfWeek = (d: Date) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // ISO Monday start
        return new Date(date.setDate(diff));
    };

    const formatDateString = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
    const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [monthlySummaries, setMonthlySummaries] = useState<any[]>([]);
    const [saving, setSaving] = useState<boolean>(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState<string>('');

    // Week View Date Selection States
    const [weekStartDate, setWeekStartDate] = useState<Date>(() => getStartOfWeek(new Date()));

    // Visual feedback states
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
    const [pendingTargetDate, setPendingTargetDate] = useState<string | null>(null);
    const [selectedSummaryEmployee, setSelectedSummaryEmployee] = useState<any | null>(null);

    // Dropdown Month Calendar Picker States
    const [calendarOpen, setCalendarOpen] = useState<boolean>(false);
    const [viewMonth, setViewMonth] = useState<number>(() => {
        const d = new Date(selectedDate);
        return d.getMonth();
    });
    const [viewYear, setViewYear] = useState<number>(() => {
        const d = new Date(selectedDate);
        return d.getFullYear();
    });

    const calendarContainerRef = useRef<HTMLDivElement>(null);

    // Sync navigated calendar dropdown month/year view whenever selectedDate changes
    useEffect(() => {
        const d = new Date(selectedDate);
        setViewMonth(d.getMonth());
        setViewYear(d.getFullYear());
    }, [selectedDate]);

    // Click outside & Escape key listeners to close calendar dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (target && target.closest && target.closest(`.${styles.calendarIconBtn}`)) {
                return;
            }
            if (calendarContainerRef.current && !calendarContainerRef.current.contains(target)) {
                setCalendarOpen(false);
            }
        };
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setCalendarOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    // Sync week view displayed whenever selectedDate changes
    useEffect(() => {
        if (selectedDate) {
            const d = new Date(selectedDate);
            const start = getStartOfWeek(d);
            if (start.getTime() !== weekStartDate.getTime()) {
                setWeekStartDate(start);
            }
        }
    }, [selectedDate, weekStartDate]);

    // Filter to active employees only and sort them alphabetically
    const activeEmployees = useMemo(() => {
        return [...employees]
            .filter(emp => emp.is_active === 1)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [employees]);

    // Fetch daily attendance whenever date changes or active employees load
    useEffect(() => {
        if (activeEmployees.length > 0) {
            fetchAttendanceForDate(selectedDate);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDate, employees]);

    // Fetch monthly summary whenever month changes
    useEffect(() => {
        fetchMonthlySummary(selectedMonth);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMonth]);

    const fetchAttendanceForDate = async (dateStr: string) => {
        // Start skeleton timer: only show skeleton if fetch takes longer than 150ms
        const skeletonTimeout = setTimeout(() => {
            setIsLoading(true);
        }, 150);

        try {
            const res = await fetch(`/api/attendance?date=${dateStr}`);
            if (res.ok) {
                const data = await res.json();
                
                // Map saved records by employeeId
                const savedMap = new Map<number, any>();
                if (data.records) {
                    data.records.forEach((rec: any) => {
                        savedMap.set(rec.employeeId, rec);
                    });
                }

                // Merge saved records with current active employees list
                const records = activeEmployees.map(emp => {
                    const saved = savedMap.get(emp.id);
                    let rawStatus = saved ? saved.status : 'unselected';
                    if (rawStatus === 'half_day') {
                        rawStatus = 'present';
                    }
                    return {
                        employeeId: emp.id,
                        name: emp.name,
                        role: emp.role,
                        status: rawStatus as 'present' | 'absent' | 'unselected'
                    };
                });

                // Clear skeleton timer and update state instantly
                clearTimeout(skeletonTimeout);
                setAttendanceRecords(records);
                setIsLoading(false);
                setHasUnsavedChanges(false);
            } else {
                clearTimeout(skeletonTimeout);
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Failed to fetch daily attendance:', error);
            clearTimeout(skeletonTimeout);
            setIsLoading(false);
        }
    };

    const fetchMonthlySummary = async (monthStr: string) => {
        try {
            const res = await fetch(`/api/attendance?month=${monthStr}`);
            if (res.ok) {
                const data = await res.json();
                setMonthlySummaries(data.summaries || []);
            }
        } catch (error) {
            console.error('Failed to fetch monthly summary:', error);
        }
    };

    // Helper wrapper to protect unsaved changes during navigation
    const attemptDateChange = (targetDate: string) => {
        if (hasUnsavedChanges) {
            setPendingTargetDate(targetDate);
        } else {
            setIsRefreshing(true);
            setTimeout(() => {
                setIsRefreshing(false);
            }, 150);
            setSelectedDate(targetDate);
        }
    };

    const handleConfirmDiscard = () => {
        if (pendingTargetDate) {
            setIsRefreshing(true);
            setTimeout(() => {
                setIsRefreshing(false);
            }, 150);
            setSelectedDate(pendingTargetDate);
            setPendingTargetDate(null);
            setHasUnsavedChanges(false);
        }
    };

    const handleConfirmSave = async () => {
        setSaving(true);
        setSaveStatus('idle');
        setMessage('');

        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: selectedDate,
                    records: attendanceRecords.filter(r => r.status !== 'unselected')
                })
            });

            if (res.ok) {
                setSaveStatus('success');
                
                // Format beautiful display date for toast
                const [year, month, day] = selectedDate.split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                const formatted = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                
                setToastMessage(`Attendance saved for ${formatted} ✓`);
                setTimeout(() => {
                    setToastMessage(null);
                }, 2500);

                // Refresh monthly summaries
                fetchMonthlySummary(selectedMonth);

                // Move active date selection to pending navigation
                if (pendingTargetDate) {
                    setIsRefreshing(true);
                    setTimeout(() => {
                        setIsRefreshing(false);
                    }, 150);
                    setSelectedDate(pendingTargetDate);
                }
                setPendingTargetDate(null);
                setHasUnsavedChanges(false);
            } else {
                const data = await res.json();
                setSaveStatus('error');
                setMessage(data.error || 'Failed to save attendance');
            }
        } catch (error) {
            console.error('Failed to save attendance:', error);
            setSaveStatus('error');
            setMessage('Network error, failed to save');
        } finally {
            setSaving(false);
        }
    };

    const shiftWeek = (offsetWeeks: number) => {
        const newWeekStart = new Date(weekStartDate);
        newWeekStart.setDate(newWeekStart.getDate() + (offsetWeeks * 7));
        
        // Calculate relative offset of current selectedDate from displayed Monday
        const currentSelected = new Date(selectedDate);
        const activeDayOfWeek = currentSelected.getDay();
        const dayOffset = activeDayOfWeek === 0 ? 6 : activeDayOfWeek - 1;
        
        const targetDate = new Date(newWeekStart);
        targetDate.setDate(targetDate.getDate() + dayOffset);
        
        // Clamp so we never select future dates
        const today = new Date();
        if (targetDate > today) {
            attemptDateChange(getTodayString());
        } else {
            attemptDateChange(formatDateString(targetDate));
        }
    };

    const isNextWeekDisabled = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const activeSunday = new Date(weekStartDate);
        activeSunday.setDate(activeSunday.getDate() + 6);
        activeSunday.setHours(23, 59, 59, 999);
        
        return today <= activeSunday;
    };

    const getWeekDays = () => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStartDate);
            day.setDate(day.getDate() + i);
            days.push(day);
        }
        return days;
    };

    const handleDayChipClick = (dayDate: Date) => {
        attemptDateChange(formatDateString(dayDate));
    };

    const handleStatusChange = (employeeId: number, status: 'present' | 'absent') => {
        setHasUnsavedChanges(true);
        setAttendanceRecords(prev =>
            prev.map(rec => {
                if (rec.employeeId === employeeId) {
                    return {
                        ...rec,
                        status
                    };
                }
                return rec;
            })
        );
    };

    const handleSaveAttendance = async () => {
        setSaving(true);
        setSaveStatus('idle');
        setMessage('');

        try {
            const res = await fetch('/api/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: selectedDate,
                    records: attendanceRecords.filter(r => r.status !== 'unselected')
                })
            });

            if (res.ok) {
                setSaveStatus('success');
                setHasUnsavedChanges(false);

                // Format beautiful display date for toast
                const [year, month, day] = selectedDate.split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                const formatted = dateObj.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

                setToastMessage(`Attendance saved for ${formatted} ✓`);
                
                // Auto dismiss toast after 2.5 seconds
                setTimeout(() => {
                    setToastMessage(null);
                    setSaveStatus('idle');
                }, 2500);

                // Refresh monthly summary
                fetchMonthlySummary(selectedMonth);
            } else {
                const data = await res.json();
                setSaveStatus('error');
                setMessage(data.error || 'Failed to save attendance');
            }
        } catch (error) {
            console.error('Failed to save attendance:', error);
            setSaveStatus('error');
            setMessage('Network error, failed to save');
        } finally {
            setSaving(false);
        }
    };

    // Format role badge styling
    const getRoleBadgeStyle = (role: string) => {
        switch (role) {
            case 'admin': return styles.roleAdmin;
            case 'manager': return styles.roleManager;
            default: return styles.roleStaff;
        }
    };

    const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

    const getCalendarGridDays = () => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        const dayOfWeek = firstDay.getDay();
        const paddingDays = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // ISO Monday start
        
        const gridStartDate = new Date(firstDay);
        gridStartDate.setDate(gridStartDate.getDate() - paddingDays);
        
        const days = [];
        const temp = new Date(gridStartDate);
        for (let i = 0; i < 42; i++) {
            days.push(new Date(temp));
            temp.setDate(temp.getDate() + 1);
        }
        return days;
    };

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(prev => prev - 1);
        } else {
            setViewMonth(prev => prev - 1);
        }
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        const today = new Date();
        if (viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth >= today.getMonth())) {
            return;
        }
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(prev => prev + 1);
        } else {
            setViewMonth(prev => prev + 1);
        }
    };

    const isCalendarNextMonthDisabled = () => {
        const today = new Date();
        return viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth >= today.getMonth());
    };

    const renderCalendarDropdown = () => {
        if (!calendarOpen) return null;
        
        const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        const gridDays = getCalendarGridDays();
        const todayStr = getTodayString();
        
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        return (
            <div className={styles.calendarDropdown} ref={calendarContainerRef} onClick={(e) => e.stopPropagation()}>
                <div className={styles.calHeader}>
                    <span className={styles.calTitle}>
                        {monthNames[viewMonth]} {viewYear}
                    </span>
                    <div className={styles.calNavGroup}>
                        <button
                            type="button"
                            className={styles.calNavBtn}
                            onClick={handlePrevMonth}
                        >
                            ‹
                        </button>
                        <button
                            type="button"
                            className={styles.calNavBtn}
                            onClick={handleNextMonth}
                            disabled={isCalendarNextMonthDisabled()}
                        >
                            ›
                        </button>
                    </div>
                </div>

                <div className={styles.calWeekDaysGrid}>
                    {weekdays.map((wd, i) => (
                        <div key={`cal-wd-${i}`} className={styles.calWeekDayHeader}>
                            {wd}
                        </div>
                    ))}
                </div>

                <div className={styles.calGrid}>
                    {gridDays.map((day, idx) => {
                        const formatted = formatDateString(day);
                        const isSelected = selectedDate === formatted;
                        const isToday = todayStr === formatted;
                        
                        const isOtherMonth = day.getMonth() !== viewMonth;
                        const todayDate = new Date();
                        todayDate.setHours(23, 59, 59, 999);
                        const isFuture = day > todayDate;
                        
                        let cellClass = styles.calCell;
                        if (isSelected) {
                            cellClass = `${styles.calCell} ${styles.calCellActive}`;
                        } else if (isOtherMonth) {
                            cellClass = `${styles.calCell} ${styles.calCellOtherMonth}`;
                        } else if (isFuture) {
                            cellClass = `${styles.calCell} ${styles.calCellFuture}`;
                        } else {
                            cellClass = `${styles.calCell} ${styles.calCellPast}`;
                        }

                        return (
                            <button
                                key={`cal-cell-${idx}`}
                                type="button"
                                className={cellClass}
                                disabled={isOtherMonth || isFuture}
                                onClick={() => {
                                    attemptDateChange(formatted);
                                    setCalendarOpen(false);
                                }}
                            >
                                {day.getDate()}
                                {isToday && (
                                    <span className={`${styles.calTodayDot} ${isSelected ? styles.calTodayDotActive : ''}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    const getMonthYearLabel = () => {
        return weekStartDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    };

    return (
        <div className={styles.tabContainer}>
            {/* Week View Date Selection Card */}
            <div className={styles.weekCardContainer}>
                <div className={styles.weekHeaderRow}>
                    <div className={styles.weekHeaderLeft}>
                        <span className={styles.monthYearLabel}>{getMonthYearLabel()}</span>
                        <button
                            type="button"
                            className={styles.calendarIconBtn}
                            onClick={() => setCalendarOpen(prev => !prev)}
                            onMouseDown={(e) => e.stopPropagation()}
                            aria-label="Open month calendar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ti ti-calendar">
                                <path d="M8 2v4" />
                                <path d="M16 2v4" />
                                <rect width="18" height="18" x="3" y="4" rx="2" />
                                <path d="M3 10h18" />
                            </svg>
                        </button>
                        <div className={styles.weekNavBtnGroup}>
                            <button
                                type="button"
                                className={styles.weekArrowBtn}
                                onClick={() => shiftWeek(-1)}
                                aria-label="Previous week"
                            >
                                ‹
                            </button>
                            <button
                                type="button"
                                className={styles.weekArrowBtn}
                                onClick={() => shiftWeek(1)}
                                disabled={isNextWeekDisabled()}
                                aria-label="Next week"
                            >
                                ›
                            </button>
                        </div>
                        {renderCalendarDropdown()}
                    </div>

                    <button
                        className={`${styles.saveBtn} ${saveStatus === 'success' ? styles.saveSuccess : ''}`}
                        onClick={handleSaveAttendance}
                        disabled={saving || activeEmployees.length === 0}
                    >
                        {saving ? (
                            <>
                                <span className="spinner" /> Saving...
                            </>
                        ) : saveStatus === 'success' ? (
                            <>✓ Saved</>
                        ) : (
                            'Save Attendance'
                        )}
                    </button>
                </div>

                <div className={styles.weekChipsGrid}>
                    {getWeekDays().map((day, idx) => {
                        const formatted = formatDateString(day);
                        const isSelected = selectedDate === formatted;
                        const isTodayChip = getTodayString() === formatted;
                        
                        // Disable future days selection
                        const today = new Date();
                        today.setHours(23, 59, 59, 999);
                        const isFuture = day > today;

                        return (
                            <button
                                key={`day-chip-${idx}`}
                                type="button"
                                className={`${styles.dayChip} ${isSelected ? styles.dayChipActive : ''}`}
                                disabled={isFuture}
                                onClick={() => handleDayChipClick(day)}
                            >
                                <span className={styles.chipDateNum}>
                                    {day.getDate()}
                                    {isTodayChip && (
                                        <span className={`${styles.todayDot} ${isSelected ? styles.todayDotActive : ''}`} />
                                    )}
                                </span>
                                <span className={styles.chipDayName}>
                                    {day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {message && (
                <div
                    style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        fontWeight: 600,
                        backgroundColor: saveStatus === 'success' ? 'rgba(52, 199, 89, 0.12)' : 'rgba(255, 59, 48, 0.12)',
                        color: saveStatus === 'success' ? '#34C759' : '#FF3B30',
                        border: `1px solid ${saveStatus === 'success' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.2)'}`
                    }}
                >
                    {message}
                </div>
            )}

            {/* Desktop Table */}
            {activeEmployees.length === 0 ? (
                <div className={styles.emptyState}>No active employees found to log attendance.</div>
            ) : (
                <>
                    <div className={`${styles.tableCard} ${isRefreshing ? styles.attendanceFade : ''}`}>
                        <table className={styles.attendanceTable}>
                            <thead>
                                <tr>
                                    <th>Employee</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    activeEmployees.map((emp, idx) => (
                                        <tr key={`skeleton-${idx}`}>
                                            <td>
                                                <div className={styles.employeeCell}>
                                                    <div className={styles.skeletonAvatar} />
                                                    <div className={styles.skeletonText} />
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.skeletonBadge} />
                                            </td>
                                            <td>
                                                <div className={styles.skeletonButtons} />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    attendanceRecords.map(rec => (
                                        <tr key={rec.employeeId}>
                                            <td>
                                                <div className={styles.employeeCell}>
                                                    <div className={styles.avatar}>
                                                        {rec.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className={styles.employeeName}>{rec.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.roleBadge} ${getRoleBadgeStyle(rec.role)}`}>
                                                    {formatRole(rec.role)}
                                                </span>
                                            </td>
                                            <td>
                                                <div 
                                                    className={styles.toggleTrack}
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        const clickX = e.clientX - rect.left;
                                                        const newStatus = clickX < rect.width / 2 ? 'present' : 'absent';
                                                        handleStatusChange(rec.employeeId, newStatus);
                                                    }}
                                                >
                                                    <div 
                                                        className={`${styles.toggleThumbWrapper} ${
                                                            rec.status === 'present' 
                                                                ? styles.thumbPresent 
                                                                : rec.status === 'absent' 
                                                                    ? styles.thumbAbsent 
                                                                    : styles.thumbDefault
                                                        }`}
                                                    >
                                                        <div 
                                                            className={`${styles.toggleThumb} ${
                                                                rec.status === 'present' 
                                                                    ? styles.toggleThumbGreen 
                                                                    : rec.status === 'absent' 
                                                                        ? styles.toggleThumbRed 
                                                                        : ''
                                                            }`} 
                                                        />
                                                    </div>
                                                    <span className={`${styles.toggleLabel} ${styles.labelLeft} ${rec.status === 'present' ? styles.labelActive : ''}`}>
                                                        Present
                                                    </span>
                                                    <span className={`${styles.toggleLabel} ${styles.labelRight} ${rec.status === 'absent' ? styles.labelActive : ''}`}>
                                                        Absent
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile responsive layout (hidden on desktop via css) */}
                    <div className={`${styles.mobileCardsContainer} ${isRefreshing ? styles.attendanceFade : ''}`}>
                        {isLoading ? (
                            activeEmployees.map((emp, idx) => (
                                <div key={`skeleton-mob-${idx}`} className={styles.mobileCard}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.employeeCell}>
                                            <div className={styles.skeletonAvatar} />
                                            <div>
                                                <div className={styles.skeletonText} style={{ width: '120px', marginBottom: '6px' }} />
                                                <div className={styles.skeletonBadge} />
                                            </div>
                                        </div>
                                        <div className={styles.skeletonButtons} style={{ width: '160px', height: '36px' }} />
                                    </div>
                                    <div className={styles.cardRow}>
                                        <div className={styles.skeletonText} style={{ width: '50px', marginBottom: '8px' }} />
                                        <div className={styles.skeletonInput} style={{ width: '100%' }} />
                                    </div>
                                </div>
                            ))
                        ) : (
                            attendanceRecords.map(rec => (
                                <div key={rec.employeeId} className={styles.mobileCard}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.employeeCell}>
                                            <div className={styles.avatar}>
                                                {rec.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className={styles.employeeName}>{rec.name}</div>
                                                <span className={`${styles.roleBadge} ${getRoleBadgeStyle(rec.role)}`} style={{ marginTop: '4px' }}>
                                                    {formatRole(rec.role)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className={styles.cardValue} style={{ width: 'auto' }}>
                                            <div 
                                                className={styles.toggleTrack}
                                                onClick={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const clickX = e.clientX - rect.left;
                                                    const newStatus = clickX < rect.width / 2 ? 'present' : 'absent';
                                                    handleStatusChange(rec.employeeId, newStatus);
                                                }}
                                            >
                                                <div 
                                                    className={`${styles.toggleThumbWrapper} ${
                                                        rec.status === 'present' 
                                                            ? styles.thumbPresent 
                                                            : rec.status === 'absent' 
                                                                ? styles.thumbAbsent 
                                                                : styles.thumbDefault
                                                    }`}
                                                >
                                                    <div 
                                                        className={`${styles.toggleThumb} ${
                                                            rec.status === 'present' 
                                                                ? styles.toggleThumbGreen 
                                                                : rec.status === 'absent' 
                                                                    ? styles.toggleThumbRed 
                                                                    : ''
                                                        }`} 
                                                    />
                                                </div>
                                                <span className={`${styles.toggleLabel} ${styles.labelLeft} ${rec.status === 'present' ? styles.labelActive : ''}`}>
                                                    Present
                                                </span>
                                                <span className={`${styles.toggleLabel} ${styles.labelRight} ${rec.status === 'absent' ? styles.labelActive : ''}`}>
                                                    Absent
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Monthly Summary Section */}
            <div className={styles.summarySection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Monthly Attendance Summary</h2>
                    <div className={styles.monthPickerWrapper}>
                        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
                    </div>
                </div>

                <div className={styles.summaryTableCard}>
                    {monthlySummaries.length === 0 ? (
                        <div className={styles.emptyState}>No attendance records logged for this month.</div>
                    ) : (
                        <table className={styles.summaryTable}>
                            <thead>
                                <tr>
                                    <th className={styles.employeeCol}>Employee</th>
                                    <th className={styles.roleCol}>Role</th>
                                    <th className={styles.centerAlign}>Present Days</th>
                                    <th className={styles.centerAlign}>Absent Days</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeEmployees.map(emp => {
                                    const summary = monthlySummaries.find(s => s.employeeId === emp.id);
                                    if (!summary) return null;

                                    return (
                                        <tr key={emp.id} onClick={() => setSelectedSummaryEmployee(emp)} className={styles.summaryRowClickable}>
                                            <td>
                                                <div className={styles.employeeCell}>
                                                    <div className={styles.avatar}>
                                                        {emp.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className={styles.employeeName}>{emp.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.roleBadge} ${getRoleBadgeStyle(emp.role)}`}>
                                                    {formatRole(emp.role)}
                                                </span>
                                            </td>
                                            <td className={styles.centerAlign}>
                                                <span className={styles.presentPill}>{summary.presentDays} Days</span>
                                            </td>
                                            <td className={styles.centerAlign}>
                                                <span className={styles.absentPill}>{summary.absentDays} Days</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Unsaved Changes Confirmation Modal */}
            {pendingTargetDate && (
                <div className={styles.modalBackdrop}>
                    <div className="global-modal-content">
                        <h3 className={styles.modalTitle}>Unsaved Changes</h3>
                        <p className={styles.modalText}>You have unsaved changes on this date. Save before changing date?</p>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.discardBtn}
                                onClick={handleConfirmDiscard}
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                className={styles.saveContinueBtn}
                                onClick={handleConfirmSave}
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save & Continue'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Saved toast notification */}
            {toastMessage && (
                <div className={styles.toastContainer}>
                    <span>{toastMessage}</span>
                </div>
            )}

            {selectedSummaryEmployee && (
                <EmployeeAttendanceModal
                    isOpen={!!selectedSummaryEmployee}
                    onClose={() => setSelectedSummaryEmployee(null)}
                    employee={selectedSummaryEmployee}
                    month={selectedMonth}
                />
            )}
        </div>
    );
}
