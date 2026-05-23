import getDatabase from '@/lib/db';

export interface ReportKPIs {
    revenueCollected: number;
    revenueBilled: number;
    outstanding: number;
    expenses: number;
    salaryPaid: number;
    netProfit: number;
}

export interface CustomerRow {
    name: string;
    revenue: number;
    orderCount: number;
    pendingAmount: number;
}

export interface InvoiceBreakdown {
    paid: number;
    unpaid: number;
    partial: number;
    overdue: number;
    totalAmount: number;
}

export interface ExpenseCategory {
    category: string;
    amount: number;
    percentage: number;
}

export interface DailyAttendance {
    date: string;
    avg: number;
}

export interface AttendanceStats {
    average: number;
    bestDay: string;
    worstDay: string;
    dailyList: DailyAttendance[];
}

export interface MonthlyTrendPoint {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
}

export interface ReportOrder {
    id: number;
    orderNumber: string;
    customerName: string;
    designName: string;
    quantityMeters: number;
    totalPrice: number;
    status: string;
    deliveryDate: string | null;
    paymentStatus: string;
    paidAmount: number;
    pendingAmount: number;
    paymentProgress: number;
    productionProgress: number;
}

export interface WeeklyReportData {
    dateRange: string;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    completionRate: number;
    orderWoWDiff: number; // current week - previous week
    orderWoWPercent: string;
    kpis: ReportKPIs;
    vendorDue: number;
    topCustomers: CustomerRow[];
    invoices: InvoiceBreakdown;
    expensesBreakdown: ExpenseCategory[];
    attendance: AttendanceStats;
    orders: ReportOrder[];
}

export interface MonthlyReportData {
    monthName: string;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
    completionRate: number;
    kpis: ReportKPIs;
    topCustomerName: string;
    topCustomers: CustomerRow[];
    invoices: InvoiceBreakdown;
    expensesBreakdown: ExpenseCategory[];
    attendance: AttendanceStats;
    monthlyTrends: MonthlyTrendPoint[];
    orders: ReportOrder[];
}

export async function getWeeklyReportData(targetDate: Date): WeeklyReportData {
    const db = getDatabase();

    const offsetIST = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(targetDate.getTime() + offsetIST);

    // Monday to Sunday of the previous week
    const dayOfWeek = todayIST.getDay(); // 0 is Sun, 1 is Mon, etc.
    const daysToSubtract = dayOfWeek === 0 ? 13 : (dayOfWeek + 6); // days back to previous Monday

    const lastMonday = new Date(todayIST.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
    lastMonday.setUTCHours(0, 0, 0, 0);

    const lastSunday = new Date(lastMonday.getTime() + 6 * 24 * 60 * 60 * 1000);
    lastSunday.setUTCHours(23, 59, 59, 999);

    // WoW comparison week
    const prevMonday = new Date(lastMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
    prevMonday.setUTCHours(0, 0, 0, 0);
    const prevSunday = new Date(prevMonday.getTime() + 6 * 24 * 60 * 60 * 1000);
    prevSunday.setUTCHours(23, 59, 59, 999);

    const startSec = Math.floor(lastMonday.getTime() / 1000);
    const endSec = Math.floor(lastSunday.getTime() / 1000);

    const prevStartSec = Math.floor(prevMonday.getTime() / 1000);
    const prevEndSec = Math.floor(prevSunday.getTime() / 1000);

    // Format Date Range
    const formatDayMonth = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const formatFull = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const dateRange = lastMonday.getMonth() === lastSunday.getMonth()
        ? `${lastMonday.getDate()}–${formatFull(lastSunday)}`
        : `${formatDayMonth(lastMonday)} – ${formatFull(lastSunday)}`;

    // 1. Orders count & status
    const orders = (await db.prepare(`
        SELECT status FROM orders 
        WHERE created_at >= ? AND created_at <= ?
    `).all(startSec, endSec)) as any[];

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => ['completed', 'delivered', 'invoiced'].includes(o.status)).length;
    const pendingOrders = totalOrders - completedOrders;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100;

    const prevOrdersCountRow = (await db.prepare(`
        SELECT COUNT(*) as count FROM orders 
        WHERE created_at >= ? AND created_at <= ?
    `).get(prevStartSec, prevEndSec)) as any;
    const prevOrdersCount = prevOrdersCountRow?.count || 0;
    const orderWoWDiff = totalOrders - prevOrdersCount;
    const orderWoWPercent = prevOrdersCount > 0 
        ? `${orderWoWDiff >= 0 ? '+' : ''}${Math.round((orderWoWDiff / prevOrdersCount) * 100)}%`
        : 'N/A';

    // 2. Financial KPIs
    const revRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM expenses 
        WHERE type = 'in' AND date >= ? AND date <= ?
    `).get(startSec, endSec)) as any;
    const revenueCollected = revRow?.total || 0;

    const billedRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM invoices 
        WHERE generated_at >= ? AND generated_at <= ?
    `).get(startSec, endSec)) as any;
    const revenueBilled = billedRow?.total || 0;

    const outstanding = Math.max(0, revenueBilled - revenueCollected);

    const salariesRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM expenses 
        WHERE type = 'out' AND category = 'Salary' AND date >= ? AND date <= ?
    `).get(startSec, endSec)) as any;
    const salaryPaid = salariesRow?.total || 0;

    const expRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM expenses 
        WHERE type = 'out' AND category != 'Salary' AND date >= ? AND date <= ?
    `).get(startSec, endSec)) as any;
    const expenses = expRow?.total || 0;

    const netProfit = revenueCollected - expenses - salaryPaid;

    const kpis: ReportKPIs = {
        revenueCollected,
        revenueBilled,
        outstanding,
        expenses,
        salaryPaid,
        netProfit
    };

    // 3. Vendor payments due
    const vendorDueRow = (await db.prepare(`
        SELECT SUM(balance) as total FROM vendor_payments 
        WHERE status IN ('unpaid', 'partial', 'overdue')
    `).get()) as any;
    const vendorDue = vendorDueRow?.total || 0;

    // 4. Top Customers contribution
    const topCustomersRaw = (await db.prepare(`
        SELECT c.name, SUM(o.total_price) as spent, COUNT(o.id) as count
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.created_at >= ? AND o.created_at <= ?
        GROUP BY o.customer_id
        ORDER BY spent DESC
        LIMIT 5
    `).all(startSec, endSec)) as any[];

    const topCustomers: CustomerRow[] = topCustomersRaw.map(async tc => {
        // Query pending invoice amount for this customer
        const pendRow = (await db.prepare(`
            SELECT SUM(amount - COALESCE(amount_paid, 0)) as pending
            FROM invoices
            WHERE customer_id = (SELECT id FROM customers WHERE name = ? LIMIT 1)
              AND status IN ('unpaid', 'partial', 'overdue')
        `).get(tc.name)) as any;
        return {
            name: tc.name,
            revenue: tc.spent || 0,
            orderCount: tc.count || 0,
            pendingAmount: pendRow?.pending || 0
        };
    });

    // 5. Invoices status breakdown
    const invoicesRaw = (await db.prepare(`
        SELECT status, SUM(amount) as total FROM invoices 
        WHERE generated_at >= ? AND generated_at <= ?
        GROUP BY status
    `).all(startSec, endSec)) as any[];

    const invoices: InvoiceBreakdown = { paid: 0, unpaid: 0, partial: 0, overdue: 0, totalAmount: 0 };
    invoicesRaw.forEach(i => {
        if (i.status === 'paid') invoices.paid = i.total;
        else if (i.status === 'unpaid') invoices.unpaid = i.total;
        else if (i.status === 'partial') invoices.partial = i.total;
        else if (i.status === 'overdue') invoices.overdue = i.total;
        invoices.totalAmount += i.total;
    });

    // 6. Expenses breakdown by category
    const catExpenses = (await db.prepare(`
        SELECT category, SUM(amount) as total FROM expenses
        WHERE type = 'out' AND date >= ? AND date <= ?
        GROUP BY category
        ORDER BY total DESC
    `).all(startSec, endSec)) as any[];

    const totalExpAll = catExpenses.reduce((acc, c) => acc + c.total, 0) || 1;
    const expensesBreakdown: ExpenseCategory[] = catExpenses.map(c => ({
        category: c.category,
        amount: c.total,
        percentage: (c.total / totalExpAll) * 100
    }));

    // 7. Attendance Analytics
    const lastMondayStr = lastMonday.toISOString().split('T')[0];
    const lastSundayStr = lastSunday.toISOString().split('T')[0];

    const attRecords = (await db.prepare(`
        SELECT date, 
               SUM(CASE WHEN status = 'present' THEN 100 WHEN status = 'half_day' THEN 50 ELSE 0 END) as points,
               COUNT(*) as count
        FROM attendance
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
    `).all(lastMondayStr, lastSundayStr)) as any[];

    const dailyList: DailyAttendance[] = [];
    let bestDay = 'N/A';
    let worstDay = 'N/A';
    let maxAvg = -1;
    let minAvg = 101;
    let totalPoints = 0;
    let totalCount = 0;

    attRecords.forEach(r => {
        const avg = r.count > 0 ? r.points / r.count : 0;
        const formattedDate = new Date(r.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        dailyList.push({ date: formattedDate, avg });
        totalPoints += r.points;
        totalCount += r.count;

        if (avg > maxAvg) {
            maxAvg = avg;
            bestDay = `${formattedDate} (${Math.round(avg)}%)`;
        }
        if (avg < minAvg) {
            minAvg = avg;
            worstDay = `${formattedDate} (${Math.round(avg)}%)`;
        }
    });

    const attendance: AttendanceStats = {
        average: totalCount > 0 ? Math.round(totalPoints / totalCount) : 100,
        bestDay: bestDay === 'N/A' ? 'N/A' : bestDay,
        worstDay: worstDay === 'N/A' ? 'N/A' : worstDay,
        dailyList
    };

    // 8. Fetch detailed orders list
    const ordersRaw = (await db.prepare(`
        SELECT 
            o.id,
            o.order_number,
            c.name as customer_name,
            d.name as design_name,
            o.quantity_meters,
            o.total_price,
            o.status,
            o.delivery_date,
            COALESCE((SELECT status FROM invoices WHERE order_id = o.id LIMIT 1), 'unpaid') as invoice_status,
            COALESCE((SELECT SUM(amount_paid) FROM invoices WHERE order_id = o.id), 0) as paid_amount
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN designs d ON o.design_id = d.id
        WHERE o.created_at >= ? AND o.created_at <= ?
        ORDER BY o.created_at DESC
    `).all(startSec, endSec)) as any[];

    const detailedOrders: ReportOrder[] = ordersRaw.map(o => {
        const totalPrice = o.total_price || 0;
        const paidAmount = o.paid_amount || 0;
        const pendingAmount = Math.max(0, totalPrice - paidAmount);
        const paymentProgress = totalPrice > 0 ? (paidAmount / totalPrice) * 100 : 0;

        let productionProgress = 0;
        if (o.status === 'pending') productionProgress = 15;
        else if (o.status === 'approved') productionProgress = 35;
        else if (o.status === 'production') productionProgress = 65;
        else if (o.status === 'completed') productionProgress = 85;
        else if (o.status === 'delivered' || o.status === 'invoiced') productionProgress = 100;

        return {
            id: o.id,
            orderNumber: o.order_number || `#${o.id}`,
            customerName: o.customer_name,
            designName: o.design_name,
            quantityMeters: o.quantity_meters || 0,
            totalPrice,
            status: o.status,
            deliveryDate: o.delivery_date,
            paymentStatus: o.invoice_status,
            paidAmount,
            pendingAmount,
            paymentProgress,
            productionProgress
        };
    });

    return {
        dateRange,
        totalOrders,
        completedOrders,
        pendingOrders,
        completionRate,
        orderWoWDiff,
        orderWoWPercent,
        kpis,
        vendorDue,
        topCustomers,
        invoices,
        expensesBreakdown,
        attendance,
        orders: detailedOrders
    };
}

export async function getMonthlyReportData(targetDate: Date): MonthlyReportData {
    const db = getDatabase();

    const offsetIST = 5.5 * 60 * 60 * 1000;
    const todayIST = new Date(targetDate.getTime() + offsetIST);

    // Calculate previous month boundaries
    const prevMonthDate = new Date(todayIST.getFullYear(), todayIST.getMonth() - 1, 1);
    const startOfMonth = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const endOfMonth = new Date(todayIST.getFullYear(), todayIST.getMonth(), 0);
    endOfMonth.setUTCHours(23, 59, 59, 999);

    const startSec = Math.floor(startOfMonth.getTime() / 1000);
    const endSec = Math.floor(endOfMonth.getTime() / 1000);

    const monthName = prevMonthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    const prevMonthStr = prevMonthDate.toISOString().split('T')[0].substring(0, 7); // "YYYY-MM"

    // 1. Orders
    const orders = (await db.prepare(`
        SELECT status FROM orders 
        WHERE created_at >= ? AND created_at <= ?
    `).all(startSec, endSec)) as any[];

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => ['completed', 'delivered', 'invoiced'].includes(o.status)).length;
    const pendingOrders = totalOrders - completedOrders;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 100;

    // 2. Financial KPIs
    const revRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM expenses 
        WHERE type = 'in' AND date >= ? AND date <= ?
    `).get(startSec, endSec)) as any;
    const revenueCollected = revRow?.total || 0;

    const billedRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM invoices 
        WHERE generated_at >= ? AND generated_at <= ?
    `).get(startSec, endSec)) as any;
    const revenueBilled = billedRow?.total || 0;

    const outstanding = Math.max(0, revenueBilled - revenueCollected);

    const salariesRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM expenses 
        WHERE type = 'out' AND category = 'Salary' AND date >= ? AND date <= ?
    `).get(startSec, endSec)) as any;
    const salaryPaid = salariesRow?.total || 0;

    const expRow = (await db.prepare(`
        SELECT SUM(amount) as total FROM expenses 
        WHERE type = 'out' AND category != 'Salary' AND date >= ? AND date <= ?
    `).get(startSec, endSec)) as any;
    const expenses = expRow?.total || 0;

    const netProfit = revenueCollected - expenses - salaryPaid;

    const kpis: ReportKPIs = {
        revenueCollected,
        revenueBilled,
        outstanding,
        expenses,
        salaryPaid,
        netProfit
    };

    // 3. Top Customers
    const topCustomersRaw = (await db.prepare(`
        SELECT c.name, SUM(o.total_price) as spent, COUNT(o.id) as count
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.created_at >= ? AND o.created_at <= ?
        GROUP BY o.customer_id
        ORDER BY spent DESC
        LIMIT 5
    `).all(startSec, endSec)) as any[];

    const topCustomers: CustomerRow[] = topCustomersRaw.map(async tc => {
        const pendRow = (await db.prepare(`
            SELECT SUM(amount - COALESCE(amount_paid, 0)) as pending
            FROM invoices
            WHERE customer_id = (SELECT id FROM customers WHERE name = ? LIMIT 1)
              AND status IN ('unpaid', 'partial', 'overdue')
        `).get(tc.name)) as any;
        return {
            name: tc.name,
            revenue: tc.spent || 0,
            orderCount: tc.count || 0,
            pendingAmount: pendRow?.pending || 0
        };
    });

    const topCustomerName = topCustomers[0]?.name || 'N/A';

    // 4. Invoices Breakdown
    const invoicesRaw = (await db.prepare(`
        SELECT status, SUM(amount) as total FROM invoices 
        WHERE generated_at >= ? AND generated_at <= ?
        GROUP BY status
    `).all(startSec, endSec)) as any[];

    const invoices: InvoiceBreakdown = { paid: 0, unpaid: 0, partial: 0, overdue: 0, totalAmount: 0 };
    invoicesRaw.forEach(i => {
        if (i.status === 'paid') invoices.paid = i.total;
        else if (i.status === 'unpaid') invoices.unpaid = i.total;
        else if (i.status === 'partial') invoices.partial = i.total;
        else if (i.status === 'overdue') invoices.overdue = i.total;
        invoices.totalAmount += i.total;
    });

    // 5. Expense breakdown by category
    const catExpenses = (await db.prepare(`
        SELECT category, SUM(amount) as total FROM expenses
        WHERE type = 'out' AND date >= ? AND date <= ?
        GROUP BY category
        ORDER BY total DESC
    `).all(startSec, endSec)) as any[];

    const totalExpAll = catExpenses.reduce((acc, c) => acc + c.total, 0) || 1;
    const expensesBreakdown: ExpenseCategory[] = catExpenses.map(c => ({
        category: c.category,
        amount: c.total,
        percentage: (c.total / totalExpAll) * 100
    }));

    // 6. Attendance Analytics
    const attStatsRow = (await db.prepare(`
        SELECT 
            SUM(CASE WHEN status = 'present' THEN 100 WHEN status = 'half_day' THEN 50 ELSE 0 END) as total_points,
            COUNT(*) as total_records
        FROM attendance
        WHERE date LIKE ?
    `).get(`${prevMonthStr}-%`)) as any;

    const attendanceAvg = attStatsRow?.total_records > 0 
        ? Math.round(attStatsRow.total_points / attStatsRow.total_records) 
        : 100;

    const attRecords = (await db.prepare(`
        SELECT date, 
               SUM(CASE WHEN status = 'present' THEN 100 WHEN status = 'half_day' THEN 50 ELSE 0 END) as points,
               COUNT(*) as count
        FROM attendance
        WHERE date LIKE ?
        GROUP BY date
        ORDER BY date ASC
    `).all(`${prevMonthStr}-%`)) as any[];

    const dailyList: DailyAttendance[] = [];
    let bestDay = 'N/A';
    let worstDay = 'N/A';
    let maxAvg = -1;
    let minAvg = 101;

    attRecords.forEach(r => {
        const avg = r.count > 0 ? r.points / r.count : 0;
        const formattedDate = new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        dailyList.push({ date: formattedDate, avg });

        if (avg > maxAvg) {
            maxAvg = avg;
            bestDay = `${formattedDate} (${Math.round(avg)}%)`;
        }
        if (avg < minAvg) {
            minAvg = avg;
            worstDay = `${formattedDate} (${Math.round(avg)}%)`;
        }
    });

    const attendance: AttendanceStats = {
        average: attendanceAvg,
        bestDay,
        worstDay,
        dailyList
    };

    // 7. Monthly Trends (last 6 months)
    const monthlyTrends: MonthlyTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(todayIST.getFullYear(), todayIST.getMonth() - i - 1, 1);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        mStart.setUTCHours(0, 0, 0, 0);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        mEnd.setUTCHours(23, 59, 59, 999);

        const msSec = Math.floor(mStart.getTime() / 1000);
        const meSec = Math.floor(mEnd.getTime() / 1000);

        const mName = d.toLocaleDateString('en-IN', { month: 'short' });

        const mRev = (await db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE type = 'in' AND date >= ? AND date <= ?`).get(msSec, meSec)) as any;
        const mExp = (await db.prepare(`SELECT SUM(amount) as total FROM expenses WHERE type = 'out' AND date >= ? AND date <= ?`).get(msSec, meSec)) as any;

        const revVal = mRev?.total || 0;
        const expVal = mExp?.total || 0;

        monthlyTrends.push({
            month: mName,
            revenue: revVal,
            expenses: expVal,
            profit: revVal - expVal
        });
    }

    // 8. Fetch detailed orders list
    const ordersRaw = (await db.prepare(`
        SELECT 
            o.id,
            o.order_number,
            c.name as customer_name,
            d.name as design_name,
            o.quantity_meters,
            o.total_price,
            o.status,
            o.delivery_date,
            COALESCE((SELECT status FROM invoices WHERE order_id = o.id LIMIT 1), 'unpaid') as invoice_status,
            COALESCE((SELECT SUM(amount_paid) FROM invoices WHERE order_id = o.id), 0) as paid_amount
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        JOIN designs d ON o.design_id = d.id
        WHERE o.created_at >= ? AND o.created_at <= ?
        ORDER BY o.created_at DESC
    `).all(startSec, endSec)) as any[];

    const detailedOrders: ReportOrder[] = ordersRaw.map(o => {
        const totalPrice = o.total_price || 0;
        const paidAmount = o.paid_amount || 0;
        const pendingAmount = Math.max(0, totalPrice - paidAmount);
        const paymentProgress = totalPrice > 0 ? (paidAmount / totalPrice) * 100 : 0;

        let productionProgress = 0;
        if (o.status === 'pending') productionProgress = 15;
        else if (o.status === 'approved') productionProgress = 35;
        else if (o.status === 'production') productionProgress = 65;
        else if (o.status === 'completed') productionProgress = 85;
        else if (o.status === 'delivered' || o.status === 'invoiced') productionProgress = 100;

        return {
            id: o.id,
            orderNumber: o.order_number || `#${o.id}`,
            customerName: o.customer_name,
            designName: o.design_name,
            quantityMeters: o.quantity_meters || 0,
            totalPrice,
            status: o.status,
            deliveryDate: o.delivery_date,
            paymentStatus: o.invoice_status,
            paidAmount,
            pendingAmount,
            paymentProgress,
            productionProgress
        };
    });

    return {
        monthName,
        totalOrders,
        completedOrders,
        pendingOrders,
        completionRate,
        kpis,
        topCustomerName,
        topCustomers,
        invoices,
        expensesBreakdown,
        attendance,
        monthlyTrends,
        orders: detailedOrders
    };
}
