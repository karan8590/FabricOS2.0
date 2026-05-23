import { WeeklyReportData } from '../utils/analytics';
import { formatCurrency, formatPercentage } from '../utils/formatting';

export function renderWeeklyReport(data: WeeklyReportData): string {
    const orderRows = data.orders.length === 0
        ? `<tr><td colSpan="7" class="px-4 py-8 text-center text-slate-400 font-medium bg-white">No orders found for this weekly period.</td></tr>`
        : data.orders.map(o => {
            // Mapped status badge style
            let statusColor = 'bg-slate-50 text-slate-700 border-slate-200';
            let progressBarColor = 'bg-slate-400';
            if (o.status === 'pending') {
                statusColor = 'bg-amber-50 text-amber-700 border-amber-200';
                progressBarColor = 'bg-amber-500';
            } else if (o.status === 'approved') {
                statusColor = 'bg-blue-50 text-blue-700 border-blue-200';
                progressBarColor = 'bg-blue-500';
            } else if (o.status === 'production') {
                statusColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                progressBarColor = 'bg-indigo-600';
            } else if (o.status === 'completed') {
                statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                progressBarColor = 'bg-emerald-500';
            } else if (o.status === 'delivered' || o.status === 'invoiced') {
                statusColor = 'bg-teal-50 text-teal-700 border-teal-200';
                progressBarColor = 'bg-teal-600';
            }

            // Mapped payment status badge style
            let payColor = 'bg-rose-50 text-rose-700 border-rose-200';
            let payBarColor = 'bg-rose-500';
            if (o.paymentStatus === 'paid') {
                payColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                payBarColor = 'bg-emerald-600';
            } else if (o.paymentStatus === 'partial') {
                payColor = 'bg-blue-50 text-blue-700 border-blue-200';
                payBarColor = 'bg-blue-600';
            } else if (o.paymentStatus === 'unpaid') {
                payColor = 'bg-amber-50 text-amber-700 border-amber-200';
                payBarColor = 'bg-amber-500';
            }

            const displayStatus = o.status.charAt(0).toUpperCase() + o.status.slice(1);
            const displayPaymentStatus = o.paymentStatus.toUpperCase();

            return `
            <tr class="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                <td class="px-4 py-3 font-mono text-xs font-bold text-navy-950">${o.orderNumber}</td>
                <td class="px-4 py-3">
                    <div class="font-semibold text-navy-900 text-xs">${o.customerName}</div>
                </td>
                <td class="px-4 py-3 text-xs text-slate-600">${o.designName}</td>
                <td class="px-4 py-3 text-right font-medium text-xs">${o.quantityMeters}m</td>
                <td class="px-4 py-3 text-right font-bold text-navy-900 text-xs">${formatCurrency(o.totalPrice)}</td>
                
                <!-- Production Status with Progress Bar -->
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${statusColor} min-w-[72px] justify-center">
                            ${displayStatus}
                        </span>
                        <div class="flex-grow min-w-[70px]">
                            <div class="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
                                <span>Progress</span>
                                <span>${o.productionProgress}%</span>
                            </div>
                            <div class="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div class="${progressBarColor} h-1 rounded-full" style="width: ${o.productionProgress}%"></div>
                            </div>
                        </div>
                    </div>
                </td>

                <!-- Payment Status with Progress Bar -->
                <td class="px-4 py-3">
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2 py-0.5 text-[9px] font-extrabold rounded-full border ${payColor} min-w-[72px] justify-center">
                            ${displayPaymentStatus}
                        </span>
                        <div class="flex-grow min-w-[70px]">
                            <div class="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
                                <span>Paid</span>
                                <span>${Math.round(o.paymentProgress)}%</span>
                            </div>
                            <div class="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div class="${payBarColor} h-1 rounded-full" style="width: ${o.paymentProgress}%"></div>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
            `;
        }).join('');

    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>FabricOS Weekly Summary</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        
        <script src="https://cdn.tailwindcss.com"></script>

        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        fontFamily: {
                            sans: ['Outfit', 'sans-serif'],
                        },
                        colors: {
                            navy: {
                                50: '#F8FAFC',
                                900: '#0F172A',
                                950: '#020617',
                            },
                            emerald: {
                                500: '#10B981',
                                600: '#059669',
                            }
                        }
                    }
                }
            }
        </script>

        <style>
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
                .page-break {
                    page-break-before: always;
                }
            }
            body {
                font-family: 'Outfit', sans-serif;
                background-color: #FFFFFF;
            }
        </style>
    </head>
    <body class="text-slate-800 p-6">
        <!-- Header -->
        <div class="border-b border-slate-100 pb-6 mb-8 flex justify-between items-end">
            <div>
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-navy-900 to-emerald-500 flex items-center justify-center text-white font-bold text-lg">F</div>
                    <span class="text-xl font-bold tracking-tight text-navy-900">FabricOS</span>
                </div>
                <h1 class="text-3xl font-extrabold text-navy-900 tracking-tight">Weekly Business Summary</h1>
                <p class="text-sm text-slate-500 mt-1 font-medium">Report period: ${data.dateRange}</p>
            </div>
            <div class="text-right">
                <span class="text-xs uppercase tracking-wider text-slate-400 font-bold">Confidential Business Report</span>
                <p class="text-xs text-slate-500 mt-1 font-medium">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST)</p>
            </div>
        </div>

        <!-- KPI Cards Grid -->
        <div class="grid grid-cols-4 gap-4 mb-8">
            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue Collected</span>
                <div class="text-2xl font-bold text-navy-900 mt-1">${formatCurrency(data.kpis.revenueCollected)}</div>
                <div class="text-xs font-medium text-slate-500 mt-1">Billed: ${formatCurrency(data.kpis.revenueBilled)}</div>
            </div>

            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-navy-900"></div>
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Net Cash Flow</span>
                <div class="text-2xl font-bold text-navy-900 mt-1">${formatCurrency(data.kpis.netProfit)}</div>
                <div class="text-xs font-medium text-slate-500 mt-1">Salaries paid: ${formatCurrency(data.kpis.salaryPaid)}</div>
            </div>

            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500"></div>
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Outstanding</span>
                <div class="text-2xl font-bold text-navy-900 mt-1">${formatCurrency(data.kpis.outstanding)}</div>
                <div class="text-xs font-medium text-slate-500 mt-1">Unpaid/Partial Invoices</div>
            </div>

            <div class="bg-slate-50 rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-red-500"></div>
                <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expenses</span>
                <div class="text-2xl font-bold text-navy-900 mt-1">${formatCurrency(data.kpis.expenses)}</div>
                <div class="text-xs font-medium text-slate-500 mt-1">Due to vendors: ${formatCurrency(data.vendorDue)}</div>
            </div>
        </div>

        <!-- Weekly Summary Banner and Stats -->
        <div class="bg-slate-50 rounded-xl p-5 border border-slate-100 shadow-sm flex flex-row items-center justify-between gap-6 mb-8">
            <div>
                <h3 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Weekly Order Volume Summary</h3>
                <div class="flex items-baseline gap-2">
                    <span class="text-4xl font-extrabold text-navy-900">${data.totalOrders}</span>
                    <span class="text-sm font-semibold text-slate-500">New Orders Placed</span>
                </div>
            </div>
            <div class="text-xs font-semibold text-slate-500 bg-white border border-slate-200/60 rounded-lg p-3">
                WoW Trend: <span class="${data.orderWoWDiff >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}">
                    ${data.orderWoWPercent} (${data.orderWoWDiff >= 0 ? '+' : ''}${data.orderWoWDiff} orders)
                </span>
            </div>
            <div class="flex gap-8 text-xs font-semibold text-slate-500 bg-white border border-slate-200/60 rounded-lg p-3">
                <div>
                    <span class="block text-slate-400 font-medium">Completed</span>
                    <span class="text-navy-900 font-bold text-sm">${data.completedOrders}</span>
                </div>
                <div>
                    <span class="block text-slate-400 font-medium">Pending</span>
                    <span class="text-navy-900 font-bold text-sm">${data.pendingOrders}</span>
                </div>
            </div>
            <div class="min-w-[150px] bg-white border border-slate-200/60 rounded-lg p-3 flex-grow max-w-[200px]">
                <div class="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Completion Rate</span>
                    <span>${formatPercentage(data.completionRate)}</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${data.completionRate}%"></div>
                </div>
            </div>
        </div>

        <!-- Section: Detailed Orders Table -->
        <div>
            <div class="flex justify-between items-center mb-3">
                <h3 class="text-sm font-extrabold text-navy-900 uppercase tracking-wider">All Weekly Orders Details</h3>
                <span class="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">${data.orders.length} Orders</span>
            </div>
            <div class="border border-slate-100 rounded-xl overflow-hidden shadow-sm bg-white">
                <table class="min-w-full divide-y divide-slate-100 text-xs">
                    <thead class="bg-slate-50 font-extrabold text-slate-500 text-left border-b border-slate-100">
                        <tr>
                            <th class="px-4 py-3">Order No</th>
                            <th class="px-4 py-3">Customer</th>
                            <th class="px-4 py-3">Design</th>
                            <th class="px-4 py-3 text-right">Quantity</th>
                            <th class="px-4 py-3 text-right">Amount</th>
                            <th class="px-4 py-3 text-center">Production Status &amp; Progress</th>
                            <th class="px-4 py-3 text-center">Payment Status &amp; Progress</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 bg-white text-slate-700">
                        ${orderRows}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Section: Footer -->
        <div class="border-t border-slate-100 pt-6 mt-8 flex justify-between items-center text-xs text-slate-400 font-medium">
            <div>
                <p>FabricOS Business Operations Portal — Confidential Document</p>
                <p class="mt-1">Generated: ${new Date().toUTCString()}</p>
            </div>
            <div class="flex gap-16 items-center">
                <div class="text-center w-28">
                    <div class="border-b border-slate-200 h-10 w-full mb-1"></div>
                    <span>Operations Lead</span>
                </div>
                <div class="text-center w-28">
                    <div class="border-b border-slate-200 h-10 w-full mb-1"></div>
                    <span>Finance Auditor</span>
                </div>
            </div>
        </div>
    </body>
</html>
`;
}
