'use client';

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import EmployeeCard from '@/components/employees/EmployeeCard';
import EmployeeModal from '@/components/employees/EmployeeModal';
import AttendanceTab from '@/components/employees/AttendanceTab';
import SalaryTab from '@/components/employees/SalaryTab';
import AdvancesTab from '@/components/employees/AdvancesTab';
import PageHeader from '@/components/ui/PageHeader';
import AppTabs from '@/components/ui/AppTabs';
import styles from './Employees.module.css';
import { usePermission } from '@/hooks/usePermission';

// Using a simplified currentUser hook mock for now. 
// Ideally should come from AuthContext.
// We'll assume the API handles security, but UI needs role to hide/show stuff.
// For now, we'll check local storage or cookie? 
// Or just let everyone see (secured by route mostly).
// Let's assume passed activeUser or fetch 'me'

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [currentUserRole, setCurrentUserRole] = useState('staff'); // default safe
    const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'salary' | 'advances'>('employees');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const search = params.get('search');
        if (search) {
            setSearchTerm(search);
        }
        fetchEmployees();
        fetchCurrentUser();
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                setCurrentUserRole(data.role);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await fetch('/api/employees');
            if (res.ok) {
                const data = await res.json();
                setEmployees(data.employees || []);
            }
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (data: any) => {
        const url = editingEmployee
            ? `/api/employees/${editingEmployee.id}`
            : '/api/employees';
        const method = editingEmployee ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to save');
        }

        fetchEmployees(); // Refresh list
    };

    const handleEdit = (employee: any) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingEmployee(null);
        setIsModalOpen(true);
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.phone.includes(searchTerm);
        const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // ... inside component
    const { can } = usePermission();

    return (
        <div className={styles.page}>
            <PageHeader
                title="Employees"
                subtitle="Manage access and internal staff"
                actions={
                    activeTab === 'employees' && can('employees.create') && (
                        <button className="action-btn-primary" onClick={handleAdd}>
                            <Plus size={16} />
                            <span>Add Employee</span>
                        </button>
                    )
                }
            />

            <AppTabs
                tabs={[
                    { id: 'employees', label: 'Employees' },
                    { id: 'attendance', label: 'Attendance' },
                    { id: 'salary', label: 'Salary' },
                    { id: 'advances', label: 'Advances' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            />

            {activeTab === 'employees' && (
                <>
                    <div className={styles.controls}>
                        <div className={styles.searchWrapper}>
                            <Input
                                placeholder="Search by name or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                icon={
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.35-4.35" />
                                    </svg>
                                }
                            />
                        </div>
                        <div className={styles.filterWrapper}>
                            <select
                                className={styles.dropdown}
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="all">All Roles</option>
                                <option value="admin">Admin</option>
                                <option value="manager">Manager</option>
                                <option value="staff">Staff</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.loading}>Loading team...</div>
                    ) : (
                        <div className={styles.grid}>
                            {filteredEmployees.length === 0 ? (
                                <div className={styles.emptyState}>
                                    No employees found matching filter.
                                </div>
                            ) : (
                                filteredEmployees.map(emp => (
                                    <EmployeeCard
                                        key={emp.id}
                                        employee={emp}
                                        currentUserRole={currentUserRole}
                                        onEdit={handleEdit}
                                    />
                                ))
                            )}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'attendance' && (
                <AttendanceTab employees={employees} />
            )}

            {activeTab === 'salary' && (
                <SalaryTab employees={employees} />
            )}

            {activeTab === 'advances' && (
                <AdvancesTab employees={employees} />
            )}

            <EmployeeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                employee={editingEmployee}
                currentUserRole={currentUserRole}
            />
        </div>
    );
}
