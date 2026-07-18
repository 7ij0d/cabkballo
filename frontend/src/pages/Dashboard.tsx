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
      setError('فشل تحميل بيانات لوحة التحكم. تأكد من اتصال الخادم.');
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
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl lg:col-span-2" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-6 rounded-2xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800 dark:text-red-400">حدث خطأ أثناء تحميل البيانات</h3>
        <p className="text-sm text-red-650 dark:text-red-300 font-semibold">{error}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-md"
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
            لوحة الإحصائيات العامة
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold font-tajawal mt-1.5">
            ملخص حركة المبيعات، الإيجارات، وتوصيل طلبيات التخرج اليوم وغداً
          </p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="self-start md:self-auto px-6 py-3 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/30 dark:hover:bg-brand-900/30 text-brand-600 dark:text-brand-400 text-sm font-bold rounded-xl border border-brand-100/50 dark:border-brand-900/50 transition-all flex items-center gap-2 shadow-sm"
        >
          <RotateCcw className="w-4 h-4" />
          تحديث البيانات
        </button>
      </div>

      {/* Outstanding Balance Deadline Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-950/15 dark:to-orange-950/5 border border-amber-250/60 dark:border-amber-900/40 p-5 rounded-2xl space-y-3.5 shadow-sm animate-slide-down">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-base font-black font-cairo">تنبيهات المدفوعات المستحقة (اقتراب موعد التسليم/التخرج)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.alerts.map((alert) => (
              <div 
                key={alert.orderId}
                className="bg-white dark:bg-slate-900/70 border border-amber-200/50 dark:border-amber-900/20 p-4 rounded-xl flex flex-col justify-between hover:shadow-md transition-all group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-600 dark:text-amber-500 font-tajawal bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-md">
                      {alert.orderNumber}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
                      موعد الاستحقاق: {formatDate(alert.nearestDate)}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mt-2.5 font-cairo">
                    {alert.customerName}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-tajawal">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{alert.phone}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-sm text-red-650 dark:text-red-400 font-black">
                    المتبقي: {formatCurrency(alert.remainingBalance)}
                  </span>
                  <button 
                    onClick={() => onNavigate('order-details', { id: alert.orderId })}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5 font-tajawal"
                  >
                    عرض الفاتورة
                    <ArrowLeftRight className="w-3 h-3 rotate-180" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-luxury-gold/5 to-transparent rounded-full -mr-4 -mt-4" />
          <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl text-brand-600 dark:text-brand-400 border border-brand-100/50 dark:border-brand-900/50">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">إجمالي الإيرادات (المحصل)</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo mt-1">
              {formatCurrency(data.totalRevenue)}
            </h3>
          </div>
        </div>

        {/* Remaining Payments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all relative overflow-hidden">
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-xl text-red-655 dark:text-red-400 border border-red-100/50 dark:border-red-900/30">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">المستحقات المتبقية</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo mt-1">
              {formatCurrency(data.remainingPayments)}
            </h3>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200/30 dark:border-slate-700/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">إجمالي الطلبات</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo mt-1">
              {data.totalOrders} طلب
            </h3>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200/30 dark:border-slate-700/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">إجمالي الزبائن</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo mt-1">
              {data.totalCustomers} زبون
            </h3>
          </div>
        </div>

        {/* Total Sales */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">قطع مبيعة</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo mt-1">
              {data.totalSales} قطعة
            </h3>
          </div>
        </div>

        {/* Total Rentals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/30 rounded-xl text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">قطع مستأجرة</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo mt-1">
              {data.totalRentals} قطعة
            </h3>
          </div>
        </div>

        {/* Total Returns */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-rose-650 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">قطع تم إرجاعها</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo mt-1">
              {data.totalReturns} قطعة
            </h3>
          </div>
        </div>

        {/* Waiting vs Delivered */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-slate-550 dark:text-slate-400 font-bold font-tajawal">طلبيات قيد التجهيز / سلمت</p>
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100 font-cairo mt-1.5 flex gap-1.5">
              <span className="text-orange-500">{data.ordersWaiting} تجهيز</span>
              <span className="text-slate-350">|</span>
              <span className="text-emerald-500">{data.ordersDelivered} سلمت</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Deliveries Schedule & Employee Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today and Tomorrow Deliveries */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              جدول تسليمات التخرج القريبة
            </h3>
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 font-tajawal">
              توصيل اليوم: {data.todayDeliveriesCount} | غداً: {data.tomorrowDeliveriesCount}
            </span>
          </div>

          <div className="space-y-4">
            {/* Today */}
            <div>
              <h4 className="text-sm font-bold text-slate-655 dark:text-slate-400 mb-2 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg font-tajawal">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                توصيلات اليوم ({data.todayDeliveries.length})
              </h4>
              {data.todayDeliveries.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-600 py-3.5 pr-2 font-tajawal">لا يوجد طلبيات مجدولة للتسليم اليوم.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-850">
                  {data.todayDeliveries.map((d) => (
                    <div key={d.id} className="py-3 flex items-center justify-between text-sm group">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.customerName}</span>
                        <span className="mx-2 text-slate-300">/</span>
                        <span className="text-slate-500 dark:text-slate-400 font-tajawal">{d.category === 'Other' ? (d.customCategory || 'أخرى') : d.category} (عدد: {d.quantity})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          d.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                          d.status === 'Ready' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' :
                          'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400'
                        }`}>
                          {d.status === 'Delivered' ? 'تم التسليم' : d.status === 'Ready' ? 'جاهز للتسليم' : 'قيد الانتظار'}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-tajawal">{d.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tomorrow */}
            <div>
              <h4 className="text-sm font-bold text-slate-655 dark:text-slate-400 mb-2 flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg font-tajawal">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                توصيلات غداً ({data.tomorrowDeliveries.length})
              </h4>
              {data.tomorrowDeliveries.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-600 py-3.5 pr-2 font-tajawal">لا يوجد طلبيات مجدولة للتسليم غداً.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-850">
                  {data.tomorrowDeliveries.map((d) => (
                    <div key={d.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{d.customerName}</span>
                        <span className="mx-2 text-slate-300">/</span>
                        <span className="text-slate-500 dark:text-slate-400 font-tajawal">{d.category === 'Other' ? (d.customCategory || 'أخرى') : d.category} (عدد: {d.quantity})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          d.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                          d.status === 'Ready' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' :
                          'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400'
                        }`}>
                          {d.status === 'Delivered' ? 'تم التسليم' : d.status === 'Ready' ? 'جاهز للطلب' : 'قيد الانتظار'}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-tajawal">{d.phone}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Employee Stats & Performance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
              أداء الموظفين
            </h3>
          </div>

          <div className="space-y-4">
            {data.employeeStats.map((emp) => (
              <div 
                key={emp.id} 
                className="p-4 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850/50 rounded-xl space-y-3 relative overflow-hidden"
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 right-0 bottom-0 w-1 ${
                  emp.name.includes('أنس') ? 'bg-brand-500' : 'bg-luxury-gold'
                }`} />
                
                <div className="flex items-center justify-between pr-2">
                  <h4 className="text-base font-black text-slate-800 dark:text-slate-200 font-cairo">الموظف: {emp.name}</h4>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-450 bg-slate-200/50 dark:bg-slate-800/60 px-2.5 py-1 rounded-md">
                    {emp.ordersCount} طلبية
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pr-2">
                  <div>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block font-tajawal">تحصيل الإيرادات</span>
                    <span className="text-sm font-black text-brand-600 dark:text-brand-400 font-cairo">
                      {formatCurrency(emp.revenue)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block font-tajawal">النسبة من الإجمالي</span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-cairo">
                      {data.totalRevenue > 0 
                        ? `${Math.round((emp.revenue / data.totalRevenue) * 100)}%` 
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Most Sold Products Summary */}
            <div className="pt-2">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2.5">التصنيفات الأكثر طلباً</h4>
              <div className="space-y-2">
                {data.mostSoldProducts.map((prod, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-655 dark:text-slate-400 font-semibold">{prod.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-brand-500 h-full rounded-full" 
                          style={{ 
                            width: `${data.totalSales > 0 ? (prod.quantity / data.totalSales) * 100 : 0}%` 
                          }}
                        />
                      </div>
                      <span className="font-bold text-slate-750 dark:text-slate-300">{prod.quantity} قطعة</span>
                    </div>
                  </div>
                ))}
                {data.mostSoldProducts.length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-600 font-tajawal">لا يوجد منتجات كافية لعرضها.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Latest Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            آخر الطلبيات المضافة
          </h3>
          <button 
            onClick={() => onNavigate('orders')}
            className="text-sm font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
          >
            عرض كافة الطلبات
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-555">
                <th className="py-3.5 px-4 font-bold font-tajawal">رقم الفاتورة</th>
                <th className="py-3.5 px-4 font-bold font-tajawal">اسم الزبون</th>
                <th className="py-3.5 px-4 font-bold font-tajawal">التاريخ</th>
                <th className="py-3.5 px-4 font-bold font-tajawal">الموظف المسؤول</th>
                <th className="py-3.5 px-4 font-bold font-tajawal">إجمالي القيمة</th>
                <th className="py-3.5 px-4 font-bold font-tajawal">حالة الدفع</th>
                <th className="py-3.5 px-4 font-bold font-tajawal">حالة الطلب</th>
                <th className="py-3.5 px-4 font-bold font-tajawal">تفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
              {data.latestOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                  <td className="py-4.5 px-4 font-black text-brand-600 dark:text-brand-400 font-tajawal">{o.orderNumber}</td>
                  <td className="py-4.5 px-4 font-bold text-slate-800 dark:text-slate-200">{o.customerName}</td>
                  <td className="py-4.5 px-4 font-semibold text-slate-500 dark:text-slate-400 font-tajawal">{formatDate(o.orderDate)}</td>
                  <td className="py-4.5 px-4 font-semibold text-slate-655 dark:text-slate-350">{o.employeeName}</td>
                  <td className="py-4.5 px-4 font-black text-slate-800 dark:text-slate-100 font-cairo">{formatCurrency(o.grandTotal)}</td>
                  <td className="py-4.5 px-4 font-semibold">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      o.paymentStatus === 'FullyPaid' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                      o.paymentStatus === 'PartiallyPaid' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' :
                      o.paymentStatus === 'DepositPaid' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-500' :
                      'bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400'
                    }`}>
                      {translatePaymentStatus(o.paymentStatus)}
                    </span>
                  </td>
                  <td className="py-4.5 px-4 font-semibold">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                      o.status === 'Completed' || o.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                      o.status === 'Cancelled' ? 'bg-red-50 dark:bg-red-950/20 text-red-650 dark:text-red-400' :
                      o.status === 'Ready' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-650 dark:text-blue-450' :
                      'bg-orange-50 dark:bg-orange-950/20 text-orange-655 dark:text-orange-455'
                    }`}>
                      {translateStatus(o.status)}
                    </span>
                  </td>
                  <td className="py-4.5 px-4">
                    <button 
                      onClick={() => onNavigate('order-details', { id: o.id })}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-250 font-bold rounded-lg text-xs transition-all border border-slate-200/20 shadow-sm"
                    >
                      فتح
                    </button>
                  </td>
                </tr>
              ))}
              {data.latestOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400 dark:text-slate-650 font-tajawal">
                    لا يوجد فواتير مسجلة في المتجر حتى الآن.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
