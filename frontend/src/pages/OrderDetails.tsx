import React, { useEffect, useState } from 'react';
import { 
  FileText, Coins, ArrowLeftRight, User, Printer, Trash2, 
  Plus, RotateCcw, AlertCircle, Calendar, Phone, Check, RefreshCw, EyeOff, Edit, MessageCircle 
} from 'lucide-react';
import { orderService, paymentService, returnService } from '../services/api';
import { formatCurrency, formatDate, translateStatus, translatePaymentStatus, translateDeliveryStatus, translateCondition } from '../utils/arabic';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';
import { supabase } from '../utils/supabaseClient';

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

interface OrderDetailsProps {
  orderId: string;
  onBack: () => void;
  onNavigate: (page: string, params?: any) => void;
  activeEmployee: { id: string; name: string } | null;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ 
  orderId, 
  onBack, 
  onNavigate, 
  activeEmployee 
}) => {
  const [order, setOrder] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data } = await supabase.from('Employee').select('id, name');
        if (data) {
          setEmployees(data.map(e => ({ value: e.id, label: e.name })));
        }
      } catch (err) {
        console.error('Failed to load employees:', err);
      }
    };
    loadEmployees();
  }, []);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState<any | null>(null);

  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('');
  const [customPayMethod, setCustomPayMethod] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payEmpId, setPayEmpId] = useState('');
  const [customPayEmp, setCustomPayEmp] = useState('');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState('');

  const [retQty, setRetQty] = useState('');
  const [retDate, setRetDate] = useState(new Date().toISOString().split('T')[0]);
  const [retCondition, setRetCondition] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [retNotes, setRetNotes] = useState('');
  const [retEmpId, setRetEmpId] = useState('');
  const [customRetEmp, setCustomRetEmp] = useState('');
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  const [returnFormError, setReturnFormError] = useState('');

  const [printType, setPrintType] = useState<'invoice' | 'receipt' | 'rental' | 'return' | null>(null);
  const [printPaymentData, setPrintPaymentData] = useState<any | null>(null);
  const [printReturnData, setPrintReturnData] = useState<any | null>(null);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const data = await orderService.getById(orderId);
      setOrder(data);
    } catch (err: any) {
      console.error(err);
      setError('فشل جلب تفاصيل الفاتورة.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    if (activeEmployee) {
      if (isPaymentModalOpen) setPayEmpId(activeEmployee.id);
      if (isReturnModalOpen) setRetEmpId(activeEmployee.id);
    }
  }, [isPaymentModalOpen, isReturnModalOpen, activeEmployee]);

  // Instant 0ms Optimistic Order Status Update
  const handleUpdateOrderStatus = async (status: string) => {
    setOrder((prev: any) => prev ? { ...prev, status } : null);
    try {
      await orderService.update(orderId, { status });
    } catch (err) {
      console.error(err);
      alert('فشل تعديل حالة الطلب.');
      fetchOrderDetails();
    }
  };

  // Instant 0ms Optimistic Item Delivery Status Update
  const handleUpdateItemDeliveryStatus = async (itemId: string, status: string) => {
    setOrder((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        items: prev.items.map((item: any) => item.id === itemId ? { ...item, status } : item)
      };
    });
    try {
      await orderService.updateItemStatus(itemId, status);
    } catch (err) {
      console.error(err);
      alert('فشل تعديل حالة تسليم المنتج.');
      fetchOrderDetails();
    }
  };

  const handleAddPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount || !payMethod || !payEmpId) {
      setPaymentFormError('يرجى تعبئة الحقول الأساسية');
      return;
    }
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      setPaymentFormError('قيمة الدفعة يجب أن تكون أكبر من الصفر');
      return;
    }

    try {
      setIsPaymentSubmitting(true);
      setPaymentFormError('');
      await paymentService.create({
        orderId,
        amount: amt,
        paymentDate: payDate,
        paymentMethod: payMethod,
        customMethodText: payMethod === 'Other' ? customPayMethod : undefined,
        notes: payNotes,
        employeeId: payEmpId
      });
      setIsPaymentModalOpen(false);
      setPayAmount('');
      setPayMethod('');
      setCustomPayMethod('');
      setPayNotes('');
      fetchOrderDetails();
    } catch (err: any) {
      console.error(err);
      setPaymentFormError(err.response?.data?.error || 'فشل إدخال الدفعة.');
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retQty || !retCondition || !retEmpId || !selectedReturnItem) {
      setReturnFormError('يرجى تعبئة الحقول الأساسية');
      return;
    }
    const qty = parseInt(retQty);
    if (isNaN(qty) || qty <= 0 || qty > selectedReturnItem.quantity) {
      setReturnFormError(`الكمية غير صحيحة، يجب أن تكون بين 1 و ${selectedReturnItem.quantity}`);
      return;
    }

    try {
      setIsReturnSubmitting(true);
      setReturnFormError('');
      await returnService.create({
        orderItemId: selectedReturnItem.id,
        quantityReturned: qty,
        returnDate: retDate,
        condition: retCondition,
        customCondition: retCondition === 'Other' ? customCondition : undefined,
        notes: retNotes,
        employeeId: retEmpId
      });
      setIsReturnModalOpen(false);
      setSelectedReturnItem(null);
      setRetQty('');
      setRetCondition('');
      setCustomCondition('');
      setRetNotes('');
      fetchOrderDetails();
    } catch (err: any) {
      console.error(err);
      setReturnFormError(err.response?.data?.error || 'فشل إرجاع المنتج.');
    } finally {
      setIsReturnSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الفاتورة بالكامل؟')) {
      try {
        await orderService.delete(orderId);
        onBack();
      } catch (err: any) {
        console.error(err);
        alert('حدث خطأ أثناء حذف الفاتورة: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  const handleDeletePayment = async (id: string, amount: number) => {
    if (window.confirm(`هل أنت متأكد من حذف دفعة العربون البالغة ${amount} د.ل؟`)) {
      try {
        setOrder((prev: any) => prev ? {
          ...prev,
          payments: prev.payments.filter((p: any) => p.id !== id),
          totalPaid: Math.max(0, prev.totalPaid - amount),
          remainingBalance: prev.remainingBalance + amount
        } : null);
        await paymentService.delete(id, activeEmployee?.id || 'مجهول');
        fetchOrderDetails();
      } catch (err: any) {
        console.error(err);
        alert('حدث خطأ أثناء حذف الدفعة: ' + (err.message || 'خطأ غير معروف'));
      }
    }
  };

  const triggerPrint = (type: 'invoice' | 'receipt' | 'rental' | 'return', data?: any) => {
    setPrintType(type);
    if (type === 'receipt') setPrintPaymentData(data);
    if (type === 'return') setPrintReturnData(data);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 py-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl lg:col-span-2" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 p-6 rounded-2xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-rose-800 dark:text-rose-400">حدث خطأ</h3>
        <p className="text-sm text-rose-600 dark:text-rose-300 font-semibold">{error}</p>
        <button 
          onClick={onBack}
          className="px-6 py-2.5 bg-slate-200 text-slate-800 rounded-xl text-sm font-bold"
        >
          رجوع
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-colors"
            >
              <ArrowLeftRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white font-cairo">
                  فاتورة رقم {order.orderNumber}
                </h1>
                <span className={`ui-badge ${
                  order.paymentStatus === 'FullyPaid' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                  order.paymentStatus === 'PartiallyPaid' ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400' :
                  'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                }`}>
                  {translatePaymentStatus(order.paymentStatus)}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-semibold font-tajawal mt-0.5">
                تاريخ الطلب: {formatDate(order.orderDate)} | الموظف: {order.employee?.name || 'غير مخصص'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => triggerPrint('invoice')}>
              الفاتورة
            </Button>
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => triggerPrint('rental')}>
              عقد الإيجار
            </Button>
            <Button variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />} onClick={() => onNavigate('orders', { editId: order.id })}>
              تعديل
            </Button>
            <Button variant="success" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => { setPaymentFormError(''); setIsPaymentModalOpen(true); }}>
              تسجيل دفعة
            </Button>
            <button onClick={handleDeleteOrder} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl" title="حذف الفاتورة">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Products Table Card */}
            <div className="ui-panel space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                <span>منتجات الفاتورة</span>
                <span className="text-xs text-slate-400 font-bold font-tajawal">عدد العناصر: {order.items.length}</span>
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {order.items.map((item: any) => (
                  <div key={item.id} className="py-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category}
                        </h4>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400 font-tajawal font-medium">
                          {item.capType && <span>النوع: {item.capType === 'Other' ? (item.customCapType || 'أخرى') : item.capType}</span>}
                          {item.capSize && <span>القياس: {item.capSize === 'Other' ? (item.customCapSize || 'أخرى') : item.capSize}</span>}
                          {item.capColor && <span>اللون: {item.capColor === 'Other' ? (item.customCapColor || 'أخرى') : item.capColor}</span>}
                          {item.operationType && (
                            <span className="font-bold text-brand-600 dark:text-brand-400">
                              [{item.operationType === 'Rental' ? 'إيجار' : 'بيع'}]
                            </span>
                          )}
                          {item.saleType && <span>ستايل: {item.saleType === 'Other' ? (item.customSaleType || 'أخرى') : item.saleType}</span>}
                          {item.broochType && <span>بروش: {item.broochType === 'Other' ? (item.customBroochType || 'أخرى') : item.broochType}</span>}
                          {item.accessoryName && <span>إكسسوار: {item.accessoryName}</span>}
                          {item.deliveryDate && <span>تسليم: {formatDate(item.deliveryDate)}</span>}
                          {item.returnDate && <span>إرجاع متوقع: {formatDate(item.returnDate)}</span>}
                          {item.graduationDate && <span>التخرج: {formatDate(item.graduationDate)}</span>}
                        </div>
                      </div>

                      <div className="text-left font-cairo">
                        <span className="text-xs font-bold text-slate-500">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                        <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                    </div>

                    {item.operationType === 'Rental' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#0B0F17] p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 font-tajawal">
                          تأمين الإيجار: {formatCurrency(item.depositAmount * item.quantity)} (مسترد عند الإرجاع السليم)
                        </span>
                        
                        {item.status !== 'Returned' ? (
                          <button
                            onClick={() => {
                              setSelectedReturnItem(item);
                              setReturnFormError('');
                              setRetQty(item.quantity.toString());
                              setIsReturnModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            تسجيل إرجاع
                          </button>
                        ) : (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-4 h-4" /> تم الإرجاع بالكامل
                          </span>
                        )}
                      </div>
                    )}

                    {/* Instant Status Toggles */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-bold font-tajawal">تسليم القطعة:</span>
                        <span className={`ui-badge ${
                          item.status === 'Delivered' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' :
                          item.status === 'Ready' ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400' :
                          item.status === 'Returned' ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400' :
                          'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                        }`}>
                          {translateDeliveryStatus(item.status)}
                        </span>
                      </div>

                      {item.status !== 'Returned' && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                          <button
                            onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Waiting')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              item.status === 'Waiting' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            انتظار
                          </button>
                          <button
                            onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Ready')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              item.status === 'Ready' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            جاهز
                          </button>
                          <button
                            onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Delivered')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              item.status === 'Delivered' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-emerald-600'
                            }`}
                          >
                            تسليم
                          </button>
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 dark:bg-[#0B0F17] p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/50 font-tajawal">
                        ملاحظات: {item.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payments Ledger Sub-table */}
            <div className="ui-panel space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/80">
                سجل الدفعات المقبوضة
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-3 font-bold font-tajawal">التاريخ</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">الموظف</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">طريقة الدفع</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">ملاحظات</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">القيمة</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {order.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400 font-tajawal">{formatDate(p.paymentDate)}</td>
                        <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">{p.employee?.name || '---'}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-400 font-tajawal">{p.paymentMethod}</td>
                        <td className="py-3 px-3 font-semibold text-slate-400 font-tajawal">{p.notes || '---'}</td>
                        <td className="py-3 px-3 font-black text-emerald-600 dark:text-emerald-400 font-cairo">{formatCurrency(p.amount)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => triggerPrint('receipt', p)}
                              className="p-1.5 text-slate-400 hover:text-brand-600 rounded-lg"
                              title="طباعة إيصال"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p.id, p.amount)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                              title="حذف الدفعة"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {order.payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400 font-tajawal">
                          لا توجد دفعات مسجلة لهذه الفاتورة حتى الآن.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="ui-panel space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                <User className="w-5 h-5 text-brand-600" />
                ملف الزبون
              </h3>

              <div className="space-y-2.5">
                <h4 
                  className="text-base font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  onClick={() => onNavigate('customer-profile', { id: order.customerId })}
                >
                  {order.customer?.name}
                </h4>
                
                <div className="flex items-center justify-between gap-1.5 bg-slate-50 dark:bg-[#0B0F17] p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-sm font-tajawal">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{order.customer?.phone}</span>
                  </div>
                  {order.customer?.phone && order.customer?.phone !== '/' && (
                    <a
                      href={getWhatsAppLink(order.customer.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>تواصل</span>
                    </a>
                  )}
                </div>

                {order.customer?.notes && (
                  <div className="bg-slate-50 dark:bg-[#0B0F17] p-3 rounded-xl text-xs text-slate-500 font-tajawal">
                    <span className="font-bold block text-slate-700 dark:text-slate-300">ملاحظات الزبون:</span>
                    <p className="mt-1 leading-relaxed">{order.customer.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Calculations */}
            <div className="ui-panel space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/80">
                الحسابات المالية
              </h3>

              <div className="space-y-3 text-sm font-bold text-slate-600 dark:text-slate-400 font-tajawal">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-black text-slate-900 dark:text-white font-cairo">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-rose-500">
                  <span>الخصم:</span>
                  <span className="font-black font-cairo">-{formatCurrency(order.discount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-slate-900 dark:text-white">
                  <span>الإجمالي المستحق:</span>
                  <span className="font-black text-base font-cairo">{formatCurrency(order.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>المدفوع:</span>
                  <span className="font-black font-cairo">+{formatCurrency(order.totalPaid)}</span>
                </div>
                <div className={`flex justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 ${
                  order.remainingBalance > 0 ? 'text-rose-600 font-black text-base' : 'text-slate-400'
                }`}>
                  <span>المتبقي:</span>
                  <span className="font-black font-cairo">{formatCurrency(order.remainingBalance)}</span>
                </div>
              </div>
            </div>

            {/* General Status Switcher */}
            <div className="ui-panel space-y-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800/80">
                تغيير حالة الفاتورة
              </h3>

              <div className="flex flex-wrap gap-1.5">
                {['Pending', 'Preparing', 'Ready', 'Delivered', 'Completed', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateOrderStatus(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      order.status === st 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {translateStatus(st)}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* PRINT MEDIA TEMPLATES */}
      <div className="print-only block">
        {printType === 'invoice' && (
          <div className="p-8 space-y-6 max-w-3xl mx-auto text-slate-900 leading-relaxed font-cairo select-text">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black">متجر التخرج للمستلزمات</h1>
                <p className="text-xs text-slate-500 font-bold mt-1">طرابلس، ليبيا | هاتف: 0912345678</p>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-brand-600">فاتورة رقم: {order.orderNumber}</h2>
                <p className="text-xs text-slate-500 mt-1">تاريخ الفاتورة: {formatDate(order.orderDate)}</p>
              </div>
            </div>

            <div className="bg-slate-100 p-4 rounded-xl space-y-1">
              <p className="text-sm font-black">الزبون: {order.customer?.name}</p>
              <p className="text-xs font-bold text-slate-600">هاتف: {order.customer?.phone}</p>
            </div>

            <table className="w-full text-right border-collapse text-xs mt-4">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100">
                  <th className="py-2.5 px-3 font-bold">اسم المنتج وتفاصيله</th>
                  <th className="py-2.5 px-3 font-bold text-center">الكمية</th>
                  <th className="py-2.5 px-3 font-bold text-left">سعر القطعة</th>
                  <th className="py-2.5 px-3 font-bold text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 px-3 font-bold">
                      {item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-left font-bold">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-left font-bold">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="w-1/2 mr-auto space-y-1.5 border-t border-slate-900 pt-3 text-xs">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 font-black text-sm">
                <span>المستحق:</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>المدفوع:</span>
                <span>+{formatCurrency(order.totalPaid)}</span>
              </div>
              <div className="flex justify-between font-black text-rose-600">
                <span>المتبقي:</span>
                <span>{formatCurrency(order.remainingBalance)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`تسجيل دفعة للفاتورة ${order.orderNumber}`}
      >
        <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                مبلغ الدفعة (د.ل) <span className="text-rose-500">*</span>
              </label>
              {order.remainingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => setPayAmount(order.remainingBalance.toString())}
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2.5 py-1 rounded-lg"
                >
                  إدخال المتبقي كاملاً ({order.remainingBalance} د.ل)
                </button>
              )}
            </div>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              required
              className="ui-input"
            />
          </div>

          <Input label="تاريخ الاستلام" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
          <Select label="طريقة الدفع" options={['Cash', 'Bank Transfer', 'Card']} value={payMethod} onChange={(val) => setPayMethod(val)} required />
          <Select label="الموظف المستلم" options={employees} value={payEmpId} onChange={(val) => setPayEmpId(val)} required />

          {paymentFormError && <p className="text-xs text-rose-500 font-bold">{paymentFormError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)} disabled={isPaymentSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={isPaymentSubmitting}>
              تسجيل العربون وحفظ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Return Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => { setIsReturnModalOpen(false); setSelectedReturnItem(null); }}
        title="تسجيل إرجاع منتج"
      >
        {selectedReturnItem && (
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <Input label="الكمية المرجعة" type="number" min="1" max={selectedReturnItem.quantity} value={retQty} onChange={(e) => setRetQty(e.target.value)} required />
            <Input label="تاريخ الإرجاع" type="date" value={retDate} onChange={(e) => setRetDate(e.target.value)} required />
            <Select label="حالة القطعة" options={['Excellent', 'Good', 'Damaged']} value={retCondition} onChange={(val) => setRetCondition(val)} required />
            <Select label="الموظف المستلم" options={employees} value={retEmpId} onChange={(val) => setRetEmpId(val)} required />

            {returnFormError && <p className="text-xs text-rose-500 font-bold">{returnFormError}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="secondary" onClick={() => { setIsReturnModalOpen(false); setSelectedReturnItem(null); }} disabled={isReturnSubmitting}>
                إلغاء
              </Button>
              <Button type="submit" isLoading={isReturnSubmitting}>
                حفظ وإرجاع القطعة
              </Button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};

export default OrderDetails;
