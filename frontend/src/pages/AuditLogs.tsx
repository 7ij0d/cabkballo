import React, { useEffect, useState } from 'react';
import { ClipboardList, Search, Calendar, RefreshCw } from 'lucide-react';
import { auditService } from '../services/api';
import { formatDate } from '../utils/arabic';
import Input from '../components/Input';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const data = await auditService.getAll();
      setLogs(data);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل سجل العمليات.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const term = search.toLowerCase();
    const empName = (log.employeeName || '').toLowerCase();
    const act = (log.action || '').toLowerCase();
    const det = (log.details || '').toLowerCase();
    return empName.includes(term) || act.includes(term) || det.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-cairo">
            سجل حركات النظام (Audit Logs)
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-tajawal mt-1">
            مراجعة كافة العمليات التي قام بها الموظفون (أنس، طه) من إدخال فواتير أو تسليم أو إرجاع
          </p>
        </div>
        <button 
          onClick={fetchLogs}
          className="self-start md:self-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-250 text-xs font-bold rounded-xl border border-slate-250/20 transition-all flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          تحديث السجل
        </button>
      </div>

      {/* Logs Table Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
        {/* Search */}
        <div className="relative max-w-md w-full">
          <Input
            label=""
            placeholder="البحث بالموظف، نوع الحركة، أو تفاصيل الإجراء..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-655" />
        </div>

        {isLoading ? (
          <div className="space-y-3 py-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                  <th className="py-2.5 px-4 font-bold font-tajawal">التاريخ والوقت</th>
                  <th className="py-2.5 px-4 font-bold font-tajawal">اسم الموظف</th>
                  <th className="py-2.5 px-4 font-bold font-tajawal">الحركة البرمجية</th>
                  <th className="py-2.5 px-4 font-bold font-tajawal">تفاصيل الإجراء المنجز</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                {filteredLogs.map((log) => {
                  const dateObj = new Date(log.createdAt);
                  const timeStr = dateObj.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="py-3.5 px-4 font-semibold text-slate-455 font-tajawal">
                        {formatDate(log.createdAt)} - {timeStr}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-800 dark:text-slate-200">
                        {log.employeeName}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black ${
                          log.action === 'LOGIN' ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20' :
                          log.action === 'CREATE_ORDER' ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/20' :
                          log.action === 'ADD_PAYMENT' ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950/20' :
                          log.action === 'RETURN_PRODUCT' ? 'bg-amber-50 text-amber-650 dark:bg-amber-950/20' :
                          'bg-slate-50 text-slate-655 dark:bg-slate-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-350 leading-relaxed font-tajawal">
                        {log.details}
                      </td>
                    </tr>
                  );
                })}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-400 font-tajawal">
                      لا يوجد أي حركات مسجلة تطابق البحث.
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

export default AuditLogs;
