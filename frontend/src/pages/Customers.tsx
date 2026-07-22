import React, { useEffect, useState, useMemo } from 'react';
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
  const [rawCustomers, setRawCustomers] = useState<CustomerListItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(selectedId || null);
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);

  useEffect(() => {
    if (selectedId) {
      setSelectedCustomerId(selectedId);
    }
  }, [selectedId]);
  
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custBackupPhone, setCustBackupPhone] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const data = await customerService.getAll();
      setRawCustomers(data);
    } catch (err: any) {
      console.error(err);
      setError('فشل تحميل قائمة الزبائن.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchProfile = async (id: string) => {
    try {
      setProfile(null);
      const data = await customerService.getById(id);
      setProfile(data);
    } catch (err: any) {
      console.error(err);
      setError('فشل جلب ملف الزبون.');
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchProfile(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  // Instant 0ms In-Memory Search
  const filteredCustomers = useMemo(() => {
    if (!search) return rawCustomers;
    const term = search.toLowerCase().trim();
    return rawCustomers.filter((c) => 
      c.name.toLowerCase().includes(term) ||
      c.phone.includes(term) ||
      (c.backupPhone && c.backupPhone.includes(term))
    );
  }, [rawCustomers, search]);

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName) {
      setFormError('يرجى كتابة اسم الزبون');
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
      setCustName('');
      setCustPhone('');
      setCustBackupPhone('');
      setCustNotes('');
      fetchCustomers();
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.error || 'فشل إضافة الزبون.');
    } finally {
      setIsFormSubmitting(false);
    }
  };

  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !custName) return;
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
      fetchProfile(selectedCustomerId);
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
    if (window.confirm(`هل أنت متأكد من حذف الزبون "${profile.name}"؟`)) {
      setRawCustomers((prev) => prev.filter((c) => c.id !== selectedCustomerId));
      setSelectedCustomerId(null);
      try {
        await customerService.delete(selectedCustomerId);
      } catch (err: any) {
        console.error(err);
        setError('فشل حذف الزبون.');
        fetchCustomers();
      }
    }
  };

  const handleDeleteCustomerFromList = async (id: string, name: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الزبون "${name}"؟`)) {
      setRawCustomers((prev) => prev.filter((c) => c.id !== id));
      try {
        await customerService.delete(id);
      } catch (err: any) {
        console.error(err);
        setError('فشل حذف الزبون.');
        fetchCustomers();
      }
    }
  };

  return (
    <div className="space-y-6">
      {selectedCustomerId && profile ? (
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedCustomerId(null)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl transition-all flex items-center"
          >
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white font-cairo">
              ملف الزبون: {profile.name}
            </h1>
            <p className="text-xs text-slate-500 font-semibold font-tajawal mt-0.5">
              سجل الفواتير والإيجارات والمدفوعات
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white font-cairo">
              سجل الزبائن
            </h1>
            <p className="text-xs text-slate-500 font-semibold font-tajawal mt-1">
              إدارة بيانات الزبائن وتتبع السجل المالي والطلبات
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
            icon={<UserPlus className="w-4 h-4" />}
          >
            إضافة زبون جديد
          </Button>
        </div>
      )}

      {!selectedCustomerId ? (
        <div className="space-y-4">
          <div className="ui-panel max-w-md w-full p-4">
            <Input
              placeholder="البحث عن زبون باسمه أو رقم الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="ui-panel p-0 overflow-hidden">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 font-bold font-tajawal">اسم الزبون</th>
                      <th className="py-3 px-4 font-bold font-tajawal">رقم الهاتف</th>
                      <th className="py-3 px-4 font-bold font-tajawal">التسجيل</th>
                      <th className="py-3 px-4 font-bold font-tajawal">الطلبات</th>
                      <th className="py-3 px-4 font-bold font-tajawal">المدفوع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">المتبقي</th>
                      <th className="py-3 px-4 font-bold font-tajawal">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6] dark:divide-slate-800/60">
                    {filteredCustomers.map((c) => (
                      <tr key={c.id} className="ui-table-row">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">{c.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400 font-tajawal">
                          <div className="flex items-center gap-2">
                            <span>{c.phone}</span>
                            {c.phone && c.phone !== '/' && (
                              <a
                                href={getWhatsAppLink(c.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md text-xs font-bold hover:bg-emerald-100 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>تواصل</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500 font-tajawal">{formatDate(c.createdAt)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300">{c.orderCount} طلبات</td>
                        <td className="py-3.5 px-4 font-black text-emerald-600 font-cairo">{formatCurrency(c.totalPaid)}</td>
                        <td className="py-3.5 px-4 font-black font-cairo">
                          {c.remainingBalance > 0 ? (
                            <span className="ui-badge bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                              {formatCurrency(c.remainingBalance)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">0.00 د.ل</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="px-3 py-1 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 font-bold rounded-lg text-xs transition-colors"
                          >
                            عرض الملف
                          </button>
                          <button 
                            onClick={() => handleDeleteCustomerFromList(c.id, c.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                            title="حذف الزبون"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
                              <Users className="w-6 h-6" />
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white font-cairo">لم يتم العثور على زبون</h3>
                            <p className="text-xs text-slate-500 font-medium font-tajawal">
                              لا يوجد زبون مطابق لاسم أو رقم الهاتف المدخل في البحث.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => {
                                setCustName('');
                                setCustPhone('');
                                setCustNotes('');
                                setFormError('');
                                setIsAddModalOpen(true);
                              }}
                              icon={<UserPlus className="w-4 h-4" />}
                            >
                              إضافة زبون جديد
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : !profile ? (
        <div className="ui-panel text-center py-12">
          <p className="text-sm font-semibold text-slate-400 font-tajawal animate-pulse">جاري تحميل ملف الزبون...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="ui-panel space-y-4">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={openEditModal} className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg" title="تعديل">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={handleDeleteCustomer} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg" title="حذف">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">{profile.name}</h3>
                <div className="flex flex-col gap-2 mt-3 text-sm font-tajawal">
                  <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-[#0B0F17] p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>الهاتف: {profile.phone}</span>
                    </div>
                    {profile.phone && profile.phone !== '/' && (
                      <a
                        href={getWhatsAppLink(profile.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>تواصل</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {profile.notes && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs text-slate-500 font-tajawal">
                  <span className="font-bold block text-slate-700 dark:text-slate-300">ملاحظات الزبون:</span>
                  <p className="mt-1 leading-relaxed">{profile.notes}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="ui-panel space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/80">
                سجل فواتير الزبون
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-3 font-bold font-tajawal">الفاتورة</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">التاريخ</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">المستحق</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">المدفوع</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">الحالة</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {profile.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                        <td className="py-3 px-3 font-bold text-brand-600 font-tajawal">{o.orderNumber}</td>
                        <td className="py-3 px-3 font-semibold text-slate-500 font-tajawal">{formatDate(o.orderDate)}</td>
                        <td className="py-3 px-3 font-black text-slate-900 dark:text-white font-cairo">{formatCurrency(o.grandTotal)}</td>
                        <td className="py-3 px-3 font-black text-emerald-600 font-cairo">{formatCurrency(o.totalPaid)}</td>
                        <td className="py-3 px-3">
                          <span className="ui-badge bg-emerald-50 text-emerald-600">
                            {translateStatus(o.status)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => onNavigate('order-details', { id: o.id })}
                            className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة زبون جديد">
        <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
          <Input label="اسم الزبون" value={custName} onChange={(e) => setCustName(e.target.value)} required />
          <Input label="رقم الهاتف" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} required />
          <Input label="رقم هاتف إضافي" value={custBackupPhone} onChange={(e) => setCustBackupPhone(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-tajawal">ملاحظات</label>
            <textarea value={custNotes} onChange={(e) => setCustNotes(e.target.value)} rows={2} className="ui-input" />
          </div>

          {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)} disabled={isFormSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={isFormSubmitting}>
              إضافة الزبون
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="تعديل بيانات الزبون">
        <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
          <Input label="اسم الزبون" value={custName} onChange={(e) => setCustName(e.target.value)} required />
          <Input label="رقم الهاتف" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} required />
          <Input label="رقم هاتف إضافي" value={custBackupPhone} onChange={(e) => setCustBackupPhone(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 font-tajawal">ملاحظات</label>
            <textarea value={custNotes} onChange={(e) => setCustNotes(e.target.value)} rows={2} className="ui-input" />
          </div>

          {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={isFormSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={isFormSubmitting}>
              حفظ التعديلات
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Customers;
