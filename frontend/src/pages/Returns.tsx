import React, { useEffect, useState } from 'react';
import { RotateCcw, Search, Calendar, Award, Info, RefreshCw } from 'lucide-react';
import { returnService } from '../services/api';
import { formatDate, translateCondition, translateCategory } from '../utils/arabic';
import Input from '../components/Input';

export const Returns: React.FC = () => {
  const [returns, setReturns] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      const data = await returnService.getAll();
      setReturns(data);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء جلب قائمة المرجوعات.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const filteredReturns = returns.filter((r) => {
    const term = search.toLowerCase();
    return (
      r.customerName.toLowerCase().includes(term) ||
      r.orderNumber.toLowerCase().includes(term) ||
      (r.notes && r.notes.toLowerCase().includes(term)) ||
      r.employeeName.toLowerCase().includes(term) ||
      r.category.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-cairo">
            عمليات المرجوعات
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-tajawal mt-1">
            متابعة إرجاع الملابس والأوشحة والقطع المستأجرة وحالتها التشغيلية
          </p>
        </div>
        <button 
          onClick={fetchReturns}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-250 text-xs font-bold rounded-xl border border-slate-250/20 transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث السجل
        </button>
      </div>

      {/* Main Table view */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <Input
            label=""
            placeholder="البحث بالزبون، الفاتورة، المنتج، أو الموظف المستلم..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-600" />
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-555">
                  <th className="py-3 px-4 font-bold font-tajawal">الزبون</th>
                  <th className="py-3 px-4 font-bold font-tajawal">رقم الفاتورة</th>
                  <th className="py-3 px-4 font-bold font-tajawal">المنتج المرتجع</th>
                  <th className="py-3 px-4 font-bold font-tajawal">الكمية المستردة</th>
                  <th className="py-3 px-4 font-bold font-tajawal">تاريخ الإرجاع</th>
                  <th className="py-3 px-4 font-bold font-tajawal">حالة المنتج</th>
                  <th className="py-3 px-4 font-bold font-tajawal">الموظف المستلم</th>
                  <th className="py-3 px-4 font-bold font-tajawal">ملاحظات الفحص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {filteredReturns.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{r.customerName}</td>
                    <td className="py-3.5 px-4 font-black text-brand-600 dark:text-brand-400 font-tajawal">{r.orderNumber}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-350">
                      {translateCategory(r.category, r.customCategory)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">{r.quantityReturned} قطع</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-455 font-tajawal">{formatDate(r.returnDate)}</td>
                    <td className="py-3.5 px-4 font-semibold">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        r.condition === 'Excellent' ? 'bg-emerald-50 text-emerald-600' :
                        r.condition === 'Good' ? 'bg-blue-50 text-blue-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {translateCondition(r.condition, r.customCondition)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-655 dark:text-slate-350">{r.employeeName}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-400 dark:text-slate-500 font-tajawal">{r.notes || 'لا يوجد ملاحظات'}</td>
                  </tr>
                ))}
                {filteredReturns.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-655 font-tajawal">
                      لا يوجد سجلات إرجاع مطابقة للبحث.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Returns;
