import React, { useEffect, useState } from 'react';
import { 
  Users, Search, Plus, UserPlus, Phone, Edit, Calendar, 
  DollarSign, FileText, History, RotateCcw, ArrowLeft, ArrowLeftRight, Save, ClipboardList, Trash2, MessageCircle 
} from 'lucide-react';
import { customerService } from '../services/api';
import { formatCurrency, formatDate, translateStatus, translatePaymentStatus, translateCondition } from '../utils/arabic';
import Button from '../components/Button';
import Input from '../components/Input';
import Modal from '../components/Modal';

const getWhatsAppLink = (phone: string) => {
  if (!phone) return '';
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) {
    return `https://wa.me/218${cleanPhone.substring(1)}`;
  }
  if (cleanPhone.startsWith('218')) {
    return `https://wa.me/${cleanPhone}`;
  }
  return `https://wa.me/218${cleanPhone}`;
};

interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  backupPhone?: string | null;
  notes: string | null;
  createdAt: string;
  lastOrderDate: string | null;
  orderCount: number;
  totalPaid: number;
  remainingBalance: number;
}

interface CustomerProfileData extends CustomerListItem {
  orders: any[];
  payments: any[];
  rentals: any[];
}

interface CustomersProps {
  onNavigate: (page: string, params?: any) => void;
  selectedId?: string;
}

export const Customers: React.FC<CustomersProps> = ({ onNavigate, selectedId }) => {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(selectedId || null);
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);

  useEffect(() => {
    if (selectedId) {
      setSelectedCustomerId(selectedId);
    }
  }, [selectedId]);
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Form fields
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custBackupPhone, setCustBackupPhone] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await customerService.getAll(search || undefined);
      setCustomers(data);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء جلب قائمة الزبائن.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfile = async (id: string) => {
    try {
      setIsProfileLoading(true);
      const data = await customerService.getById(id);
      setProfile(data);
    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء تحميل ملف الزبون.');
    } finally {
      setIsProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchProfile(selectedCustomerId);
    } else {
      setProfile(null);
    }
  }, [selectedCustomerId]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone) {
      setFormError('الاسم ورقم الهاتف مطلوبان');
      return;
    }
    try {
      setIsFormSubmitting(true);
      setFormError('');
      await customerService.create({
        name: custName,
        phone: custPhone,
        backupPhone: custBackupPhone,
        notes: custNotes
      });
      setIsAddModalOpen(false);
      // Reset
      setCustName('');
      setCustPhone('');
      setCustBackupPhone('');
      setCustNotes('');
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.error || 'فشل إضافة الزبون الجديد.');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName || !custPhone || !selectedCustomerId) {
      setFormError('الاسم ورقم الهاتف مطلوبان');
      return;
    }
    try {
      setIsFormSubmitting(true);
      setFormError('');
      await customerService.update(selectedCustomerId, {
        name: custName,
        phone: custPhone,
        backupPhone: custBackupPhone,
        notes: custNotes
      });
      setIsEditModalOpen(false);
      fetchCustomers();
      if (selectedCustomerId) {
        fetchProfile(selectedCustomerId);
      }
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.error || 'فشل تحديث بيانات الزبون.');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (profile) {
      setCustName(profile.name);
      setCustPhone(profile.phone);
      setCustBackupPhone(profile.backupPhone || '');
      setCustNotes(profile.notes || '');
      setFormError('');
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!profile || !selectedCustomerId) return;
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف الزبون "${profile.name}"؟ سيؤدي ذلك لحذف كافة فواتيره ومدفوعاته وعمليات الإيجار الخاصة به نهائياً!`);
    if (!confirmDelete) return;

    try {
      setError('');
      await customerService.delete(selectedCustomerId);
      setSelectedCustomerId(null);
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      setError('فشل حذف الزبون. قد يكون مرتبطاً بعمليات أخرى.');
    }
  };

  const handleDeleteCustomerFromList = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف الزبون "${name}"؟ سيؤدي ذلك لحذف كافة فواتيره ومدفوعاته وعمليات الإيجار الخاصة به نهائياً!`);
    if (!confirmDelete) return;

    try {
      setError('');
      await customerService.delete(id);
      if (selectedCustomerId === id) {
        setSelectedCustomerId(null);
      }
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      setError('فشل حذف الزبون. قد يكون مرتبطاً بعمليات أخرى.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Navigation Header */}
      {selectedCustomerId && profile ? (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedCustomerId(null)}
            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-200 rounded-xl transition-all shadow-sm flex items-center"
          >
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-cairo">
              ملف الزبون: {profile.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold font-tajawal mt-1">
              عرض سجل الفواتير، الإيجارات، والمدفوعات والمستحقات للزبون
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-cairo">
              سجل الزبائن
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold font-tajawal mt-1.5">
              إضافة زبائن جدد، وتتبع ميزانية كل زبون وسجل طلباتهم
            </p>
          </div>
          <Button 
            onClick={() => {
              setCustName('');
              setCustPhone('');
              setCustNotes('');
              setFormError('');
              setIsAddModalOpen(true);
            }}
            icon={<UserPlus className="w-5 h-5" />}
            className="px-6 py-3 text-sm"
          >
            إضافة زبون جديد
          </Button>
        </div>
      )}

      {/* Main Container */}
      {!selectedCustomerId ? (
        // Customers List View
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md w-full">
            <Input
              label=""
              placeholder="البحث عن زبون باسمه أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 text-sm py-3"
            />
            <Search className="absolute left-3.5 top-4 w-5 h-5 text-slate-400 dark:text-slate-655" />
          </div>

          {isLoading ? (
            <div className="space-y-3 py-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-555">
                    <th className="py-3.5 px-4 font-bold font-tajawal">اسم الزبون</th>
                    <th className="py-3.5 px-4 font-bold font-tajawal">رقم الهاتف</th>
                    <th className="py-3.5 px-4 font-bold font-tajawal">تاريخ التسجيل</th>
                    <th className="py-3.5 px-4 font-bold font-tajawal">تاريخ آخر طلب</th>
                    <th className="py-3.5 px-4 font-bold font-tajawal">عدد الطلبات</th>
                    <th className="py-3.5 px-4 font-bold font-tajawal">إجمالي المدفوع</th>
                    <th className="py-3.5 px-4 font-bold font-tajawal">المتبقي بذمته</th>
                    <th className="py-3.5 px-4 font-bold font-tajawal">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                      <td className="py-4.5 px-4 font-bold text-slate-800 dark:text-slate-200">{c.name}</td>
                      <td className="py-4.5 px-4 font-semibold text-slate-600 dark:text-slate-400 font-tajawal">
                        <div className="flex items-center gap-2">
                          <span>{c.phone}</span>
                          {c.phone && c.phone !== '/' && (
                            <a
                              href={getWhatsAppLink(c.phone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition-all hover:bg-emerald-100/60 dark:hover:bg-emerald-950/40 border border-emerald-100/30"
                              title="تواصل واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>تواصل</span>
                            </a>
                          )}
                        </div>
                        {c.backupPhone && (
                          <div className="flex items-center gap-2 text-xs text-slate-450 dark:text-slate-550 mt-1.5">
                            <span>احتياطي: {c.backupPhone}</span>
                            {c.backupPhone && c.backupPhone !== '/' && (
                              <a
                                href={getWhatsAppLink(c.backupPhone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold transition-all hover:bg-emerald-100/60 border border-emerald-100/20"
                                title="تواصل واتساب (احتياطي)"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>تواصل</span>
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4.5 px-4 font-semibold text-slate-500 dark:text-slate-455 font-tajawal">{formatDate(c.createdAt)}</td>
                      <td className="py-4.5 px-4 font-semibold text-slate-500 dark:text-slate-455 font-tajawal">{formatDate(c.lastOrderDate)}</td>
                      <td className="py-4.5 px-4 font-bold text-slate-700 dark:text-slate-350">{c.orderCount} طلبات</td>
                      <td className="py-4.5 px-4 font-black text-emerald-650 dark:text-emerald-450 font-cairo">{formatCurrency(c.totalPaid)}</td>
                      <td className="py-4.5 px-4 font-black font-cairo">
                        {c.remainingBalance > 0 ? (
                          <span className="text-red-650 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-3 py-1 rounded-lg font-bold text-xs">
                            {formatCurrency(c.remainingBalance)}
                          </span>
                        ) : (
                          <span className="text-slate-450 dark:text-slate-600 text-xs">0.00 د.ل</span>
                        )}
                      </td>
                      <td className="py-4.5 px-4 flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="px-4 py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-900/30 text-brand-600 dark:text-brand-400 font-bold rounded-lg text-sm transition-all"
                        >
                          عرض الملف
                        </button>
                        <button 
                          onClick={() => handleDeleteCustomerFromList(c.id, c.name)}
                          className="p-2 text-slate-400 hover:text-red-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                          title="حذف الزبون"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-600 font-tajawal">
                        لا يوجد زبائن مطابقين للبحث.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : !profile ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-155/80 p-8 rounded-2xl text-center">
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 font-tajawal animate-pulse">جاري تحميل ملف الزبون...</p>
        </div>
      ) : (
        // Single Customer Profile View
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar Info Card */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand-600" />
              
              <div className="flex justify-between items-start">
                <div className="p-3 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 rounded-2xl">
                  <Users className="w-8 h-8" />
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={openEditModal}
                    className="p-2 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="تعديل بيانات الزبون"
                  >
                    <Edit className="w-4.5 h-4.5" />
                  </button>
                  <button 
                    onClick={handleDeleteCustomer}
                    className="p-2 text-slate-400 hover:text-red-655 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    title="حذف الزبون"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100">{profile.name}</h3>
                <div className="flex flex-col gap-2 mt-2.5 text-sm text-slate-550 dark:text-slate-400 font-tajawal">
                  <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>الهاتف الأساسي: {profile.phone}</span>
                    </div>
                    {profile.phone && profile.phone !== '/' && (
                      <a
                        href={getWhatsAppLink(profile.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition-all hover:bg-emerald-100/60 border border-emerald-100/30"
                        title="تواصل عبر الواتساب"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>تواصل</span>
                      </a>
                    )}
                  </div>
                  {profile.backupPhone && (
                    <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-slate-955/40 p-2 rounded-xl border border-slate-100 dark:border-slate-850">
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <Phone className="w-4 h-4" />
                        <span>الهاتف الاحتياطي: {profile.backupPhone}</span>
                      </div>
                      {profile.backupPhone && profile.backupPhone !== '/' && (
                        <a
                          href={getWhatsAppLink(profile.backupPhone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold transition-all hover:bg-emerald-100/60 border border-emerald-100/30"
                          title="تواصل عبر الواتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>تواصل</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {profile.notes && (
                <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 font-tajawal">ملاحظات عن الزبون:</span>
                  <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed font-tajawal mt-1">{profile.notes}</p>
                </div>
              )}

              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/60 text-sm font-bold text-slate-500 dark:text-slate-455 font-tajawal space-y-2">
                <div className="flex justify-between">
                  <span>تاريخ التسجيل:</span>
                  <span>{formatDate(profile.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>آخر زيارة للطلب:</span>
                  <span>{formatDate(profile.lastOrderDate)}</span>
                </div>
              </div>
            </div>

            {/* Financial Status Summary */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider font-tajawal">الملخص المالي الميزانية</h4>
              
              <div className="space-y-3">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/40 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-450 font-tajawal">إجمالي المدفوعات المستلمة</span>
                    <h3 className="text-xl font-black text-emerald-700 dark:text-emerald-350 font-cairo mt-1">{formatCurrency(profile.totalPaid)}</h3>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-500/35" />
                </div>

                <div className={`p-4 rounded-xl flex items-center justify-between border ${
                  profile.remainingBalance > 0 
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-100/40 text-red-700 dark:text-red-400' 
                    : 'bg-slate-50 dark:bg-slate-950/20 border-slate-150/40 text-slate-655 dark:text-slate-400'
                }`}>
                  <div>
                    <span className="text-xs font-bold font-tajawal">المتبقي بذمته</span>
                    <h3 className="text-xl font-black font-cairo mt-1">{formatCurrency(profile.remainingBalance)}</h3>
                  </div>
                  <DollarSign className="w-8 h-8 opacity-35" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Profiles Logs Tabs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Orders Ledger */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                سجل الفواتير والطلبيات ({profile.orders.length})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-555">
                      <th className="py-3 px-4 font-bold font-tajawal">رقم الطلب</th>
                      <th className="py-3 px-4 font-bold font-tajawal">التاريخ</th>
                      <th className="py-3 px-4 font-bold font-tajawal">الموظف</th>
                      <th className="py-3 px-4 font-bold font-tajawal">المبلغ الإجمالي</th>
                      <th className="py-3 px-4 font-bold font-tajawal">المدفوع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">حالة الدفع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {profile.orders.map((o) => (
                      <tr 
                        key={o.id} 
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all cursor-pointer font-tajawal"
                        onClick={() => onNavigate('order-details', { id: o.id })}
                      >
                        <td className="py-4.5 px-4 font-black text-brand-600 dark:text-brand-400">{o.orderNumber}</td>
                        <td className="py-4.5 px-4 font-semibold text-slate-500 dark:text-slate-455">{formatDate(o.orderDate)}</td>
                        <td className="py-4.5 px-4 font-semibold text-slate-700 dark:text-slate-350">{o.employeeName}</td>
                        <td className="py-4.5 px-4 font-black text-slate-850 dark:text-slate-100 font-cairo">{formatCurrency(o.grandTotal)}</td>
                        <td className="py-4.5 px-4 font-black text-emerald-650 font-cairo">{formatCurrency(o.totalPaid)}</td>
                        <td className="py-4.5 px-4 font-semibold">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            o.paymentStatus === 'FullyPaid' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' :
                            o.paymentStatus === 'PartiallyPaid' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' :
                            o.paymentStatus === 'DepositPaid' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600' :
                            'bg-red-50 dark:bg-red-950/20 text-red-600'
                          }`}>
                            {translatePaymentStatus(o.paymentStatus)}
                          </span>
                        </td>
                        <td className="py-4.5 px-4 font-semibold">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            o.status === 'Completed' || o.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                            o.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                            o.status === 'Ready' ? 'bg-blue-50 text-blue-650' :
                            'bg-orange-50 text-orange-655'
                          }`}>
                            {translateStatus(o.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {profile.orders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-450 dark:text-slate-600 font-tajawal">
                          لا يوجد فواتير مسجلة للزبون.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments History Ledger */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <History className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                سجل حركات تسديد الدفوعات ({profile.payments.length})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-555">
                      <th className="py-3 px-4 font-bold font-tajawal">تاريخ الدفعة</th>
                      <th className="py-3 px-4 font-bold font-tajawal">رقم الطلب</th>
                      <th className="py-3 px-4 font-bold font-tajawal">الموظف المستلم</th>
                      <th className="py-3 px-4 font-bold font-tajawal">طريقة الدفع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">ملاحظات الدفع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">القيمة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {profile.payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all font-tajawal">
                        <td className="py-4.5 px-4 font-semibold text-slate-500">{formatDate(p.paymentDate)}</td>
                        <td 
                          className="py-4.5 px-4 font-black text-brand-600 hover:underline cursor-pointer"
                          onClick={() => onNavigate('order-details', { id: p.orderId })}
                        >
                          {p.orderNumber}
                        </td>
                        <td className="py-4.5 px-4 font-semibold text-slate-655 dark:text-slate-400">{p.employee?.name || '---'}</td>
                        <td className="py-4.5 px-4 font-semibold text-slate-600 dark:text-slate-350">{p.paymentMethod}</td>
                        <td className="py-4.5 px-4 font-semibold text-slate-400 dark:text-slate-500">{p.notes || '---'}</td>
                        <td className="py-4.5 px-4 font-black text-emerald-650 dark:text-emerald-450 font-cairo">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                    {profile.payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-450 dark:text-slate-600 font-tajawal">
                          لم يتم استلام أي دفعات مالية من الزبون حتى الآن.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rentals & Returns History */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <RotateCcw className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                سجل إيجار المنتجات ومطالبة الإرجاع ({profile.rentals.length})
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-555">
                      <th className="py-3 px-4 font-bold font-tajawal">رقم الطلب</th>
                      <th className="py-3 px-4 font-bold font-tajawal">اسم المنتج</th>
                      <th className="py-3 px-4 font-bold font-tajawal">الكمية</th>
                      <th className="py-3 px-4 font-bold font-tajawal">تاريخ التسليم</th>
                      <th className="py-3 px-4 font-bold font-tajawal">تاريخ الإرجاع المتوقع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">سعر الإيجار</th>
                      <th className="py-3 px-4 font-bold font-tajawal">التأمين المستلم</th>
                      <th className="py-3 px-4 font-bold font-tajawal">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {profile.rentals.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all font-tajawal">
                        <td 
                          className="py-4.5 px-4 font-black text-brand-600 hover:underline cursor-pointer"
                          onClick={() => onNavigate('order-details', { id: r.orderId })}
                        >
                          {r.orderNumber}
                        </td>
                        <td className="py-4.5 px-4 font-bold text-slate-750 dark:text-slate-200">
                          {r.category === 'Other' ? (r.customCategory || 'أخرى') : r.category}
                        </td>
                        <td className="py-4.5 px-4 font-bold text-slate-700 dark:text-slate-350">{r.quantity} قطع</td>
                        <td className="py-4.5 px-4 font-semibold text-slate-500">{formatDate(r.deliveryDate)}</td>
                        <td className="py-4.5 px-4 font-semibold text-slate-500">{formatDate(r.returnDate)}</td>
                        <td className="py-4.5 px-4 font-black text-slate-800 dark:text-slate-100 font-cairo">{formatCurrency(r.unitPrice)}</td>
                        <td className="py-4.5 px-4 font-black text-slate-800 dark:text-slate-100 font-cairo">{formatCurrency(r.depositAmount)}</td>
                        <td className="py-4.5 px-4 font-semibold">
                          <span className={`px-3 py-1 rounded-lg text-xs font-bold ${
                            r.status === 'Returned' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
                          }`}>
                            {r.status === 'Returned' ? 'تم الإرجاع' : 'لم يتم الإرجاع'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {profile.rentals.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-450 dark:text-slate-600 font-tajawal">
                          لا يوجد حركات إيجار مسجلة للزبون.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="إضافة حساب زبون جديد"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <Input
            label="اسم الزبون بالكامل"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            required
            placeholder="مثال: صالح مسعود بن طاهر"
          />
          <Input
            label="رقم هاتف الزبون"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            required
            placeholder="مثال: 0912345678"
          />
          <Input
            label="رقم الهاتف الاحتياطي (اختياري)"
            value={custBackupPhone}
            onChange={(e) => setCustBackupPhone(e.target.value)}
            placeholder="مثال: 0921234567"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">ملاحظات عامة</label>
            <textarea
              value={custNotes}
              onChange={(e) => setCustNotes(e.target.value)}
              rows={3}
              placeholder="اكتب أي تفاصيل إضافية مثل الجامعة، القياسات، التفضيلات..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-all shadow-sm"
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isFormSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              isLoading={isFormSubmitting}
            >
              حفظ الزبون
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="تحديث بيانات الزبون"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="اسم الزبون بالكامل"
            value={custName}
            onChange={(e) => setCustName(e.target.value)}
            required
          />
          <Input
            label="رقم هاتف الزبون"
            value={custPhone}
            onChange={(e) => setCustPhone(e.target.value)}
            required
          />
          <Input
            label="رقم الهاتف الاحتياطي (اختياري)"
            value={custBackupPhone}
            onChange={(e) => setCustBackupPhone(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-350">ملاحظات عامة</label>
            <textarea
              value={custNotes}
              onChange={(e) => setCustNotes(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-all shadow-sm"
            />
          </div>

          {formError && <p className="text-xs text-red-500">{formError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isFormSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              isLoading={isFormSubmitting}
            >
              حفظ التغييرات
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default Customers;
