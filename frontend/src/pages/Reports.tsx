import React, { useState, useEffect } from 'react';
import { 
  BarChart, Calendar, FileText, Download, TrendingUp, 
  ArrowLeftRight, RotateCcw, Award, CheckCircle, RefreshCw 
} from 'lucide-react';
import { reportService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/arabic';
import Button from '../components/Button';
import Input from '../components/Input';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Fix jsPDF type issues for plugins
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface ReportData {
  summary: {
    totalOrders: number;
    totalCustomers: number;
    totalSales: number;
    totalRentals: number;
    totalReturns: number;
    revenue: number;
    grandTotalGenerated: number;
    remainingPayments: number;
  };
  employeeStats: any[];
  productsBreakdown: any[];
  topCustomers: any[];
}

export const Reports: React.FC = () => {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReport = async () => {
    try {
      setIsLoading(true);
      setError('');
      const report = await reportService.getSummary(startDate, endDate);
      setData(report);
    } catch (err: any) {
      console.error(err);
      setError('فشل تحميل تقرير الفترة المحددة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Quick Preset Handlers
  const handleQuickPreset = (preset: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    let start = new Date();

    if (preset === 'today') {
      // Start of today
      start.setHours(0,0,0,0);
    } else if (preset === 'week') {
      start.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      start.setMonth(today.getMonth() - 1);
    } else if (preset === 'year') {
      start.setFullYear(today.getFullYear() - 1);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);
    
    // Trigger update
    setTimeout(() => {
      fetchReport();
    }, 50);
  };

  // Export to Excel / CSV using XLSX
  const exportToExcel = (format: 'xlsx' | 'csv') => {
    if (!data) return;

    // 1. Prepare general summary sheet data
    const summaryData = [
      { 'البيان': 'تاريخ البداية', 'القيمة': startDate },
      { 'البيان': 'تاريخ النهاية', 'القيمة': endDate },
      { 'البيان': 'إجمالي عدد الطلبات', 'القيمة': data.summary.totalOrders },
      { 'البيان': 'عدد الزبائن النشطين', 'القيمة': data.summary.totalCustomers },
      { 'البيان': 'إجمالي القطع المبيعة', 'القيمة': data.summary.totalSales },
      { 'البيان': 'إجمالي القطع المستأجرة', 'القيمة': data.summary.totalRentals },
      { 'البيان': 'عدد القطع المرجعة', 'القيمة': data.summary.totalReturns },
      { 'البيان': 'إجمالي إيرادات النقد المحصل', 'القيمة': `${data.summary.revenue} د.ل` },
      { 'البيان': 'قيمة الفواتير المصدرة', 'القيمة': `${data.summary.grandTotalGenerated} د.ل` },
      { 'البيان': 'المستحقات المتبقية بذمة الزبائن', 'القيمة': `${data.summary.remainingPayments} د.ل` }
    ];

    // 2. Prepare products breakdown sheet
    const productsData = data.productsBreakdown.map(p => ({
      'اسم المنتج / التصنيف': p.name,
      'عدد المبيعات': p.sales,
      'عدد الإيجارات': p.rentals,
      'إجمالي القطع': p.total
    }));

    // 3. Prepare employees stats sheet
    const employeesData = data.employeeStats.map(e => ({
      'اسم الموظف': e.name,
      'عدد الطلبات المنجزة': e.ordersCount,
      'الإيرادات المحصلة بواسطته': `${e.revenue} د.ل`
    }));

    // 4. Create Workbook
    const wb = XLSX.utils.book_new();
    
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'الملخص المالي');

    const wsProducts = XLSX.utils.json_to_sheet(productsData);
    XLSX.utils.book_append_sheet(wb, wsProducts, 'حركة المنتجات');

    const wsEmployees = XLSX.utils.json_to_sheet(employeesData);
    XLSX.utils.book_append_sheet(wb, wsEmployees, 'أداء الموظفين');

    // Write file
    const fileName = `Graduation_Store_Report_${startDate}_to_${endDate}.${format}`;
    XLSX.writeFile(wb, fileName, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  };

  // Export to PDF using jsPDF + AutoTable
  const exportToPDF = () => {
    if (!data) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Simple document header (Since standard JS fonts don't support Arabic easily, we will write labels in English for PDF structure representation, or use basic unicode formatting. Arabic names will be shown in table rows)
    doc.setFontSize(18);
    doc.text('Graduation Store Financial Report', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 31);

    // 1. General statistics table
    const summaryRows = [
      ['Total Orders', data.summary.totalOrders],
      ['Active Customers', data.summary.totalCustomers],
      ['Products Sold Quantity', data.summary.totalSales],
      ['Products Rented Quantity', data.summary.totalRentals],
      ['Returned Quantity', data.summary.totalReturns],
      ['Total Cash Revenue Collected', `${data.summary.revenue.toFixed(2)} LYD`],
      ['Total Invoice Values Created', `${data.summary.grandTotalGenerated.toFixed(2)} LYD`],
      ['Outstanding Balance Owed', `${data.summary.remainingPayments.toFixed(2)} LYD`]
    ];

    doc.autoTable({
      startY: 38,
      head: [['Financial & Activity Metric', 'Value']],
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 9 }
    });

    // 2. Products Breakdown table
    const productRows = data.productsBreakdown.map(p => [
      p.name,
      p.sales,
      p.rentals,
      p.total
    ]);

    doc.autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [['Product Category', 'Sales Qty', 'Rentals Qty', 'Total Qty']],
      body: productRows,
      theme: 'striped',
      styles: { fontSize: 9 }
    });

    // Save
    doc.save(`Graduation_Store_Report_${startDate}_to_${endDate}.pdf`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse py-6">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-6 rounded-2xl text-center max-w-xl mx-auto space-y-3">
        <h3 className="text-lg font-bold text-red-800">فشل جلب التقارير</h3>
        <p className="text-sm text-red-650 font-semibold">{error}</p>
        <button 
          onClick={fetchReport}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-cairo">
            التقارير المالية والتحليلات
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-tajawal mt-1">
            استخراج تقارير المبيعات، الإيجارات، أداء الموظفين وتصديرها للملفات المحاسبية
          </p>
        </div>
      </div>

      {/* Date Pickers & Presets Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-48">
            <Input
              label="تاريخ البداية"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="w-48">
            <Input
              label="تاريخ النهاية"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={fetchReport}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            توليد التقرير
          </Button>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            <button 
              onClick={() => handleQuickPreset('today')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200/50"
            >
              اليوم
            </button>
            <button 
              onClick={() => handleQuickPreset('week')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200/50"
            >
              آخر 7 أيام
            </button>
            <button 
              onClick={() => handleQuickPreset('month')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200/50"
            >
              آخر 30 يوم
            </button>
            <button 
              onClick={() => handleQuickPreset('year')}
              className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200/50"
            >
              هذا العام
            </button>
          </div>
        </div>
      </div>

      {/* Exporting Actions Panel */}
      <div className="flex flex-wrap gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={() => exportToExcel('xlsx')}
        >
          تصدير إلى Excel
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={() => exportToExcel('csv')}
        >
          تصدير إلى CSV
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={exportToPDF}
        >
          تصدير كملف PDF
        </Button>
      </div>

      {/* Period Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total revenue in range */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/35 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-650 dark:text-emerald-400 block font-tajawal">الإيرادات النقدية المحصلة</span>
            <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-350 font-cairo mt-1">
              {formatCurrency(data.summary.revenue)}
            </h3>
          </div>
          <TrendingUp className="w-10 h-10 text-emerald-500/25" />
        </div>

        {/* Invoice amounts in range */}
        <div className="bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/35 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-650 dark:text-blue-400 block font-tajawal">مجموع قيم الفواتير المصدرة</span>
            <h3 className="text-xl font-black text-blue-700 dark:text-blue-350 font-cairo mt-1">
              {formatCurrency(data.summary.grandTotalGenerated)}
            </h3>
          </div>
          <FileText className="w-10 h-10 text-blue-500/25" />
        </div>

        {/* Outstanding balances created in range */}
        <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-100 dark:border-amber-900/35 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-655 dark:text-amber-400 block font-tajawal">المستحقات المتبقية بذمة الزبائن</span>
            <h3 className="text-xl font-black text-amber-700 dark:text-amber-350 font-cairo mt-1">
              {formatCurrency(data.summary.remainingPayments)}
            </h3>
          </div>
          <BarChart className="w-10 h-10 text-amber-500/25" />
        </div>
      </div>

      {/* Breakdown Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Products breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-brand-600" />
            حركة التصنيفات خلال الفترة (البيع والإيجار)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="py-2 px-3 font-bold font-tajawal">التصنيف</th>
                  <th className="py-2 px-3 font-bold text-center font-tajawal">عدد المبيعات</th>
                  <th className="py-2 px-3 font-bold text-center font-tajawal">عدد الإيجارات</th>
                  <th className="py-2 px-3 font-bold text-left font-tajawal">المجموع الكلي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {data.productsBreakdown.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">{p.name}</td>
                    <td className="py-3 px-3 text-center text-indigo-500 font-bold">{p.sales} قطع</td>
                    <td className="py-3 px-3 text-center text-teal-500 font-bold">{p.rentals} قطع</td>
                    <td className="py-3 px-3 text-left font-black text-slate-800 dark:text-slate-150">{p.total} قطعة</td>
                  </tr>
                ))}
                {data.productsBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 font-tajawal">لا يوجد حركة مبيعات للمنتجات في هذه الفترة.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Employee performance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" />
            توزيع حركات المبيعات والقبض المالي بين الموظفين
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="py-2 px-3 font-bold font-tajawal">اسم الموظف</th>
                  <th className="py-2 px-3 font-bold text-center font-tajawal">عدد الطلبات المنشأة</th>
                  <th className="py-2 px-3 font-bold text-left font-tajawal">إيراد النقد المحصل بواسطته</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {data.employeeStats.map((e, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200">{e.name}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-700 dark:text-slate-350">{e.ordersCount} طلبات</td>
                    <td className="py-3.5 px-3 text-left font-black text-emerald-650 dark:text-emerald-450 font-cairo">{formatCurrency(e.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Top Customers in range */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-brand-600" />
          الزبائن الأكثر نشاطاً وشراءً خلال الفترة
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                <th className="py-2.5 px-3 font-bold font-tajawal">الترتيب</th>
                <th className="py-2.5 px-3 font-bold font-tajawal">اسم الزبون</th>
                <th className="py-2.5 px-3 font-bold font-tajawal">رقم الهاتف</th>
                <th className="py-2.5 px-3 font-bold text-center font-tajawal">عدد الطلبات بالفترة</th>
                <th className="py-2.5 px-3 font-bold text-left font-tajawal">إجمالي المدفوعات المستلمة منه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
              {data.topCustomers.map((tc, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-bold text-slate-400">#{idx + 1}</td>
                  <td className="py-3 px-3 font-bold text-slate-850 dark:text-slate-200">{tc.name}</td>
                  <td className="py-3 px-3 font-semibold text-slate-500 font-tajawal">{tc.phone}</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-350">{tc.orders} طلبات</td>
                  <td className="py-3 px-3 text-left font-black text-emerald-650 dark:text-emerald-450 font-cairo">{formatCurrency(tc.paid)}</td>
                </tr>
              ))}
              {data.topCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400 font-tajawal">لا يوجد نشاط كافٍ للزبائن خلال هذه الفترة.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Reports;
