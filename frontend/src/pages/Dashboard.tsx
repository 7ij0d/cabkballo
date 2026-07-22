import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag, Users, Coins, ArrowLeftRight, RotateCcw, 
  Clock, CheckCircle, Flame, Calendar, DollarSign, 
  AlertTriangle, Phone, ArrowUpRight 
} from 'lucide-react';
import { reportService } from '../services/api';
import { formatCurrency, formatDate, translateStatus, translatePaymentStatus } from '../utils/arabic';

interface DashboardData {
  totalOrders: number;
  totalCustomers: number;
  totalSales: number;
  totalRentals: number;
  totalReturns: number;
  totalRevenue: number;
  remainingPayments: number;
  ordersWaiting: number;
  ordersDelivered: number;
  todayDeliveriesCount: number;
  tomorrowDeliveriesCount: number;
  todayDeliveries: any[];
  tomorrowDeliveries: any[];
  mostSoldProducts: any[];
  employeeStats: any[];
  latestOrders: any[];
  alerts: any[];
}

interface DashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const dashboard = await reportService.getDashboard();
      setData(dashboard);
    } catch (err: any) {
      console.error(err);
      setError('فشل تحميل بيانات لوحة التحكم.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ui-panel text-center py-12 space-y-3 max-w-lg mx-auto mt-12">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-rose-600">فشل تحميل الإحصائيات</h3>
        <p className="text-xs text-slate-500 font-semibold">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-5 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold shadow-sm"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'إجمالي المقبوضات', value: formatCurrency(data.totalRevenue), icon: <Coins className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'المتبقي بذمة الزبائن', value: formatCurrency(data.remainingPayments), icon: <DollarSign className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50 dark:bg-rose-950/30' },
    { label: 'إجمالي الطلبات', value: `${data.totalOrders} طلب`, icon: <ShoppingBag className="w-5 h-5 text-brand-600" />, bg: 'bg-brand-50 dark:bg-brand-950/30' },
    { label: 'عدد الزبائن', value: `${data.totalCustomers} زبون`, icon: <Users className="w-5 h-5 text-sky-600" />, bg: 'bg-sky-50 dark:bg-sky-950/30' },
    { label: 'قطع البيع', value: `${data.totalSales} قطعة`, icon: <CheckCircle className="w-5 h-5 text-emerald-600" />, bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'قطع الإيجار', value: `${data.totalRentals} قطعة`, icon: <Clock className="w-5 h-5 text-purple-600" />, bg: 'bg-purple-50 dark:bg-purple-950/30' },
    { label: 'تسليمات اليوم', value: `${data.todayDeliveriesCount} تسليم`, icon: <Calendar className="w-5 h-5 text-amber-600" />, bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'تنبيهات الاستحقاق', value: `${data.alerts.length} تنبيه`, icon: <AlertTriangle className="w-5 h-5 text-rose-600" />, bg: 'bg-rose-50 dark:bg-rose-950/30' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white font-cairo">
            لوحة الإحصائيات العامة
          </h1>
          <p className="text-xs text-slate-500 font-semibold font-tajawal mt-1">
            ملخص مبيعات المعرض وإيجار قبعات وكابات التخرج
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="self-start sm:self-auto px-4 py-2 bg-white dark:bg-[#111622] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-800/80 transition-colors flex items-center gap-2 shadow-sm"
        >
          <RotateCcw className="w-4 h-4 text-slate-400" />
          تحديث البيانات
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <div key={idx} className="ui-card p-5 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-tajawal block">{card.label}</span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white font-cairo mt-1">{card.value}</h3>
            </div>
            <div className={`p-3 rounded-xl ${card.bg}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Orders */}
        <div className="lg:col-span-2 ui-panel space-y-4 p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">أحدث الفواتير المسجلة</h3>
            <button 
              onClick={() => onNavigate('orders')}
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline font-tajawal"
            >
              عرض الكل
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-4 font-bold font-tajawal">الفاتورة</th>
                  <th className="py-2.5 px-4 font-bold font-tajawal">الزبون</th>
                  <th className="py-2.5 px-4 font-bold font-tajawal">المبلغ</th>
                  <th className="py-2.5 px-4 font-bold font-tajawal">حالة الدفع</th>
                  <th className="py-2.5 px-4 font-bold font-tajawal text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {data.latestOrders.slice(0, 6).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-brand-600 dark:text-brand-400 font-tajawal">{o.orderNumber}</td>
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">{o.customer?.name}</td>
                    <td className="py-3 px-4 font-black text-slate-900 dark:text-white font-cairo">{formatCurrency(o.grandTotal)}</td>
                    <td className="py-3 px-4">
                      <span className="ui-badge bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        {translatePaymentStatus(o.paymentStatus)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => onNavigate('order-details', { id: o.id })}
                        className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg transition-colors"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Most Sold Items & Performance */}
        <div className="ui-panel space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            المنتجات الأكثر طلبًا
          </h3>

          <div className="space-y-3">
            {data.mostSoldProducts.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0B0F17] rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-cairo">{p.productName}</span>
                <span className="ui-badge bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-cairo">
                  {p.count} قطعة
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
