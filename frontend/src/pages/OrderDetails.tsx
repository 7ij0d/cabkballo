import React, { useEffect, useState } from 'react';
import { 
  FileText, Coins, ArrowLeftRight, User, Printer, Trash2, 
  Plus, RotateCcw, AlertCircle, Calendar, Phone, Check, RefreshCw, EyeOff, Edit, MessageCircle, ArrowLeft, AlertTriangle
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
  const [isExceptionModalOpen, setIsExceptionModalOpen] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState<any | null>(null);

  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('Cash');
  const [customPayMethod, setCustomPayMethod] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payEmpId, setPayEmpId] = useState('');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState('');

  const [retQty, setRetQty] = useState('');
  const [retDate, setRetDate] = useState(new Date().toISOString().split('T')[0]);
  const [retCondition, setRetCondition] = useState('Excellent');
  const [customCondition, setCustomCondition] = useState('');
  const [retNotes, setRetNotes] = useState('');
  const [retEmpId, setRetEmpId] = useState('');
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  const [returnFormError, setReturnFormError] = useState('');

  const [exceptionNotes, setExceptionNotes] = useState('');
  const [selectedExceptionItem, setSelectedExceptionItem] = useState<any | null>(null);

  const [printType, setPrintType] = useState<'invoice' | 'receipt' | 'rental' | 'return' | null>(null);

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
      if (isReturnModalOpen || isExceptionModalOpen) setRetEmpId(activeEmployee.id);
    }
  }, [isPaymentModalOpen, isReturnModalOpen, isExceptionModalOpen, activeEmployee]);

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

  // SMART PAYMENT GUARD: Cannot exceed remaining balance!
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

    if (order && amt > order.remainingBalance + 0.01) {
      setPaymentFormError(`عفواً! لا يمكن زيادة مال أكثر من المبلغ المتبقي المستحق وهو (${order.remainingBalance} د.ل).`);
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
      setPayMethod('Cash');
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

  // 1-CLICK COMPLETE ORDER RETURN
  const handleReturnAllItems = async () => {
    if (!order) return;
    if (window.confirm('هل أنت متأكد من الضغط على (تم إرجاع الطلبية بالكامل)؟ سيتم تحديث كافة القطع المؤجرة إلى حالة مرجعة.')) {
      try {
        setIsLoading(true);
        for (const item of order.items) {
          if (item.operationType === 'Rental' && item.status !== 'Returned') {
            await orderService.updateItemStatus(item.id, 'Returned');
          }
        }
        await orderService.update(orderId, { status: 'Completed' });
        fetchOrderDetails();
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء الإرجاع الكامل.');
      } finally {
        setIsLoading(false);
      }
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
      setRetNotes('');
      fetchOrderDetails();
    } catch (err: any) {
      console.error(err);
      setReturnFormError(err.response?.data?.error || 'فشل إرجاع المنتج.');
    } finally {
      setIsReturnSubmitting(false);
    }
  };

  const handleSaveException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExceptionItem || !exceptionNotes) {
      alert('يرجى كتابة سبب الاستثناء أو تحديد القطعة التي لم ترجع.');
      return;
    }
    try {
      setIsReturnSubmitting(true);
      await orderService.updateItemStatus(selectedExceptionItem.id, 'Waiting');
      await orderService.update(orderId, { notes: (order.notes || '') + `\n[استثناء قطعة لم ترجع]: ${exceptionNotes}` });
      setIsExceptionModalOpen(false);
      setSelectedExceptionItem(null);
      setExceptionNotes('');
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
      alert('فشل حفظ الاستثناء.');
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
    if (window.confirm(`هل أنت متأكد من حذف هذه الدفعة البالغة ${amount} د.ل؟`)) {
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
        alert('حدث خطأ أثناء حذف الدفعة.');
      }
    }
  };

  const triggerPrint = (type: 'invoice' | 'receipt' | 'rental' | 'return') => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 py-8 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl lg:col-span-2" />
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="ui-panel text-center py-12 space-y-4 max-w-md mx-auto mt-12">
        <AlertCircle className="w-10 h-10 text-[#EF4444] mx-auto" />
        <h3 className="text-xl font-bold text-[#111827] dark:text-white font-cairo">حدث خطأ في الفاتورة</h3>
        <p className="text-xs text-[#6B7280] font-medium font-tajawal">{error}</p>
        <Button variant="secondary" onClick={onBack}>الرجوع للفواتير</Button>
      </div>
    );
  }

  const firstItem = order.items?.[0] || {};
  const deliveryDate = firstItem.deliveryDate || order.orderDate;
  const returnDate = firstItem.returnDate;
  const graduationDate = firstItem.graduationDate;
  const hasRental = order.items?.some((i: any) => i.operationType === 'Rental');
  const allReturned = hasRental && order.items?.filter((i: any) => i.operationType === 'Rental').every((i: any) => i.status === 'Returned');

  return (
    <div className="space-y-8">
      <div className="no-print space-y-8">
        
        {/* 1. VISUAL HEADER CARD */}
        <div className="ui-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="p-2.5 text-[#6B7280] hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-slate-800 rounded-2xl transition-colors cursor-pointer"
                title="رجوع"
              >
                <ArrowLeft className="w-[18px] h-[18px] rotate-180" />
              </button>
              
              <h1 className="text-3xl font-bold font-cairo text-[#111827] dark:text-white tracking-tight">
                فاتورة رقم {order.orderNumber}
              </h1>

              <span className={`ui-badge text-xs px-3.5 py-1 rounded-full ${
                order.paymentStatus === 'FullyPaid' ? 'bg-[#DCFCE7] text-[#15803D]' :
                order.paymentStatus === 'PartiallyPaid' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                'bg-[#FEF3C7] text-[#B45309]'
              }`}>
                {translatePaymentStatus(order.paymentStatus)}
              </span>
            </div>
            
            <p className="text-xs text-[#6B7280] font-normal font-tajawal pr-11">
              تاريخ الفاتورة: {formatDate(order.orderDate)} | الموظف: {order.employee?.name || 'غير مخصص'}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="text-right sm:text-left">
              <span className="text-xs font-medium text-[#6B7280] font-tajawal block">المتبقي المطلوب دفعها</span>
              <h2 className={`text-2xl font-bold font-cairo mt-0.5 ${
                order.remainingBalance > 0 ? 'text-[#EF4444]' : 'text-[#16A34A]'
              }`}>
                {formatCurrency(order.remainingBalance)}
              </h2>
            </div>

            {/* Smart Payment Trigger */}
            {order.remainingBalance > 0 ? (
              <Button 
                variant="primary" 
                size="md" 
                icon={<Plus className="w-[18px] h-[18px]" />} 
                onClick={() => { 
                  setPaymentFormError(''); 
                  setPayAmount(order.remainingBalance.toString()); 
                  setIsPaymentModalOpen(true); 
                }}
              >
                إكمال الدفع ({order.remainingBalance} د.ل)
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 px-4 py-2 bg-[#DCFCE7] text-[#15803D] rounded-2xl text-xs font-bold font-tajawal">
                <Check className="w-4 h-4" /> خالية من الديون (خالصة)
              </span>
            )}
          </div>
        </div>

        {/* 1.5 PROMINENT ORDER STATUS WORKFLOW BAR */}
        <div className="ui-panel p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#111622] border border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-xs font-tajawal text-slate-700 dark:text-slate-300">
            <span>مرحلة الطلبية الحالية:</span>
            <span className="ui-badge bg-brand-50 text-brand-600 text-xs font-black font-cairo">
              {translateStatus(order.status)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateOrderStatus('Preparing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-tajawal transition-all cursor-pointer ${
                order.status === 'Preparing' ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ⏳ قيد التجهيز
            </button>

            <button
              type="button"
              onClick={() => handleUpdateOrderStatus('Ready')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-tajawal transition-all cursor-pointer ${
                order.status === 'Ready' ? 'bg-sky-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              📦 جاهزة للاستلام
            </button>

            <button
              type="button"
              onClick={() => handleUpdateOrderStatus('Delivered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-tajawal transition-all cursor-pointer ${
                order.status === 'Delivered' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              🚚 استلمها الزبون (تم التسليم)
            </button>

            <button
              type="button"
              onClick={() => handleUpdateOrderStatus('Completed')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-tajawal transition-all cursor-pointer ${
                order.status === 'Completed' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              ✅ اكتملت بالكامل
            </button>
          </div>
        </div>

        {/* 2. PROMINENT DATES & DEPOSIT SUMMARY CARD */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="ui-card p-4 space-y-1">
            <span className="text-xs font-bold text-[#6B7280] font-tajawal block">تاريخ طلعت (التسليم)</span>
            <div className="text-base font-bold text-[#111827] dark:text-white font-cairo">
              {formatDate(deliveryDate)}
            </div>
          </div>

          <div className="ui-card p-4 space-y-1">
            <span className="text-xs font-bold text-[#6B7280] font-tajawal block">تاريخ التخرج</span>
            <div className="text-base font-bold text-[#0284C7] font-cairo">
              {graduationDate ? formatDate(graduationDate) : 'غير محدد'}
            </div>
          </div>

          <div className="ui-card p-4 space-y-1">
            <span className="text-xs font-bold text-[#6B7280] font-tajawal block">تاريخ الرجوع (الإرجاع)</span>
            <div className="text-base font-bold text-[#D97706] font-cairo">
              {hasRental ? (returnDate ? formatDate(returnDate) : 'غير محدد') : 'غير ينطبق (بيع نهائي)'}
            </div>
          </div>

          <div className="ui-card p-4 space-y-1">
            <span className="text-xs font-bold text-[#6B7280] font-tajawal block">العربون المدفوع أولاً</span>
            <div className="text-base font-bold text-[#16A34A] font-cairo">
              {formatCurrency(order.totalPaid)}
            </div>
          </div>

          <div className="ui-card p-4 space-y-1 bg-[#FEF2F2]/60 dark:bg-rose-950/20 border-[#FCA5A5]/40">
            <span className="text-xs font-bold text-[#EF4444] font-tajawal block">المتبقي المطلوب دفعها</span>
            <div className="text-base font-bold text-[#EF4444] font-cairo">
              {formatCurrency(order.remainingBalance)}
            </div>
          </div>

        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="md" icon={<Printer className="w-[18px] h-[18px] text-[#6B7280]" />} onClick={() => triggerPrint('invoice')}>
              طباعة الفاتورة
            </Button>
            <Button variant="secondary" size="md" icon={<Printer className="w-[18px] h-[18px] text-[#6B7280]" />} onClick={() => triggerPrint('rental')}>
              طباعة عقد الإيجار
            </Button>
            <Button variant="secondary" size="md" icon={<Edit className="w-[18px] h-[18px] text-[#6B7280]" />} onClick={() => onNavigate('orders', { editId: order.id })}>
              تعديل الفاتورة
            </Button>
          </div>

          {/* Quick Return Triggers */}
          {hasRental && (
            <div className="flex items-center gap-2">
              {!allReturned ? (
                <>
                  <button
                    onClick={handleReturnAllItems}
                    className="px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer font-cairo"
                  >
                    <Check className="w-4 h-4" />
                    تم إرجاع الطلبية بالكامل
                  </button>

                  <button
                    onClick={() => {
                      setSelectedExceptionItem(order.items.find((i: any) => i.operationType === 'Rental'));
                      setIsExceptionModalOpen(true);
                    }}
                    className="px-4 py-2.5 bg-[#FFFBEB] hover:bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-cairo"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    إضافة استثناء (قطعة لم ترجع)
                  </button>
                </>
              ) : (
                <span className="px-4 py-2 bg-[#DCFCE7] text-[#15803D] rounded-2xl text-xs font-bold font-tajawal flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> تم إرجاع جميع القطع بالكامل
                </span>
              )}
            </div>
          )}

          <Button variant="danger" size="md" icon={<Trash2 className="w-[18px] h-[18px]" />} onClick={handleDeleteOrder}>
            حذف الفاتورة
          </Button>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* PRODUCTS LIST */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xl font-bold font-cairo text-[#111827] dark:text-white">
                  القطع والمنتجات المطلوبة ({order.items.length})
                </h2>
              </div>

              {/* Product Cards */}
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="ui-card space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#111827] dark:text-white font-cairo">
                          {item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3F4F6] text-[#374151] dark:bg-slate-800 dark:text-slate-300">
                            {item.operationType === 'Rental' ? 'إيجار' : 'بيع'}
                          </span>
                          {item.capType && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-800">
                              {item.capType}
                            </span>
                          )}
                          {item.broochType && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-800">
                              {item.broochType}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className={`ui-badge text-xs px-3.5 py-1 rounded-full ${
                        item.status === 'Delivered' ? 'bg-[#DCFCE7] text-[#15803D]' :
                        item.status === 'Ready' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                        item.status === 'Returned' ? 'bg-[#F3E8FF] text-[#6B21A8]' :
                        'bg-[#FEF3C7] text-[#B45309]'
                      }`}>
                        {translateDeliveryStatus(item.status)}
                      </span>
                    </div>

                    <div className="border-t border-[#F3F4F6] dark:border-slate-800" />

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-tajawal">
                      <div>
                        <span className="text-xs text-[#6B7280] font-medium block">الكمية والسعر</span>
                        <span className="text-base font-semibold font-cairo text-[#111827] dark:text-white mt-0.5 block">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-[#6B7280] font-medium block">تاريخ التسليم والعودة</span>
                        <span className="text-xs font-semibold font-tajawal text-[#374151] dark:text-slate-200 mt-0.5 block">
                          طلع: {formatDate(item.deliveryDate || order.orderDate)}
                          {item.returnDate && ` | رجع: ${formatDate(item.returnDate)}`}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-[#6B7280] font-medium block">إجمالي القطعة</span>
                        <span className="text-base font-bold font-cairo text-[#16A34A] mt-0.5 block">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PAYMENTS TABLE (امتى دفع باقي المبلغ) */}
            <div className="ui-panel space-y-4">
              <h2 className="text-xl font-bold font-cairo text-[#111827] dark:text-white pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
                سجل المبالغ والدفعات التابعة للفاتورة
              </h2>

              <div className="overflow-x-auto rounded-2xl border border-[#E5E7EB] dark:border-slate-800">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] dark:border-slate-800 bg-[#F9FAFB] dark:bg-[#0B0F17] text-[#6B7280]">
                      <th className="py-3.5 px-4 font-bold font-tajawal">تاريخ الدفع (امتى دفع)</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal">الموظف المستلم</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal">طريقة الدفع</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal">المبلغ المدفوع</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments.map((p: any) => (
                      <tr key={p.id} className="ui-table-row">
                        <td className="py-4 px-4 font-medium text-[#374151] dark:text-slate-300 font-tajawal">{formatDate(p.paymentDate)}</td>
                        <td className="py-4 px-4 font-semibold text-[#111827] dark:text-white">{p.employee?.name || '---'}</td>
                        <td className="py-4 px-4 font-medium text-[#6B7280] font-tajawal">{p.paymentMethod}</td>
                        <td className="py-4 px-4 font-bold text-[#16A34A] font-cairo">+{formatCurrency(p.amount)}</td>
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(p.id, p.amount)}
                            className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg transition-colors cursor-pointer"
                            title="حذف الدفعة"
                          >
                            <Trash2 className="w-[18px] h-[18px]" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {order.payments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#9CA3AF] font-tajawal">
                          لا توجد دفعات مسجلة حتى الآن.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            
            {/* CUSTOMER CARD */}
            <div className="ui-card space-y-4">
              <h3 className="text-lg font-bold text-[#111827] dark:text-white border-b border-[#E5E7EB] dark:border-slate-800 pb-3 flex items-center gap-2">
                <User className="w-[18px] h-[18px] text-[#16A34A]" />
                بيانات الزبون
              </h3>

              <div className="space-y-3">
                <h4 
                  className="text-lg font-bold text-[#16A34A] hover:underline cursor-pointer"
                  onClick={() => onNavigate('customer-profile', { id: order.customerId })}
                >
                  {order.customer?.name}
                </h4>
                
                <div className="flex items-center justify-between gap-2 p-3 bg-[#F9FAFB] dark:bg-[#0B0F17] rounded-xl border border-[#E5E7EB] dark:border-slate-800 text-sm font-tajawal">
                  <div className="flex items-center gap-2">
                    <Phone className="w-[18px] h-[18px] text-[#9CA3AF]" />
                    <span className="font-semibold text-[#374151] dark:text-slate-200">{order.customer?.phone}</span>
                  </div>
                  {order.customer?.phone && order.customer?.phone !== '/' && (
                    <a
                      href={getWhatsAppLink(order.customer.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#DCFCE7] text-[#15803D] rounded-xl text-xs font-bold hover:bg-[#BBF7D0] transition-colors"
                    >
                      <MessageCircle className="w-[18px] h-[18px]" />
                      <span>تواصل</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* FINANCIAL SUMMARY WIDGET */}
            <div className="ui-card space-y-4">
              <h3 className="text-lg font-bold text-[#111827] dark:text-white border-b border-[#E5E7EB] dark:border-slate-800 pb-3">
                الملخص المالي والمتبقي
              </h3>

              <div className="space-y-3.5 text-sm font-tajawal">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] font-medium">إجمالي الفاتورة:</span>
                  <span className="font-bold text-[#111827] dark:text-white font-cairo text-base">{formatCurrency(order.grandTotal)}</span>
                </div>

                <div className="flex justify-between items-center text-[#16A34A]">
                  <span className="font-medium">المدفوع أولاً (العربون):</span>
                  <span className="font-bold font-cairo text-base">+{formatCurrency(order.totalPaid)}</span>
                </div>

                <div className={`border-t border-[#E5E7EB] dark:border-slate-800 pt-3.5 flex justify-between items-center p-3.5 rounded-xl ${
                  order.remainingBalance > 0 ? 'bg-[#FEF2F2] dark:bg-rose-950/30 border border-[#FCA5A5]/40' : 'bg-[#F0FDF4] dark:bg-emerald-950/30 border border-[#86EFAC]/40'
                }`}>
                  <span className="font-bold text-sm">باقي القيمة المطلوب دفعها:</span>
                  <span className={`font-bold font-cairo text-xl ${
                    order.remainingBalance > 0 ? 'text-[#EF4444]' : 'text-[#16A34A]'
                  }`}>
                    {formatCurrency(order.remainingBalance)}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* PRINT MEDIA TEMPLATE */}
      <div className="print-only block">
        {printType === 'invoice' && (
          <div className="p-8 space-y-6 max-w-3xl mx-auto text-[#111827] leading-relaxed font-cairo select-text">
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div>
                <h1 className="text-2xl font-bold">متجر التخرج للمستلزمات</h1>
                <p className="text-xs text-gray-500 mt-1">طرابلس، ليبيا | هاتف: 0912345678</p>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-[#16A34A]">فاتورة رقم: {order.orderNumber}</h2>
                <p className="text-xs text-gray-500 mt-1">تاريخ الفاتورة: {formatDate(order.orderDate)}</p>
              </div>
            </div>

            <div className="bg-gray-100 p-4 rounded-xl space-y-1">
              <p className="text-sm font-bold">الزبون: {order.customer?.name}</p>
              <p className="text-xs text-gray-600">هاتف: {order.customer?.phone}</p>
            </div>

            <table className="w-full text-right border-collapse text-xs mt-4">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="py-2.5 px-3 font-bold">اسم المنتج وتفاصيله</th>
                  <th className="py-2.5 px-3 font-bold text-center">الكمية</th>
                  <th className="py-2.5 px-3 font-bold text-left">سعر القطعة</th>
                  <th className="py-2.5 px-3 font-bold text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
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

            <div className="w-1/2 mr-auto space-y-1.5 border-t border-black pt-3 text-xs">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-black pt-1.5 font-bold text-sm">
                <span>المستحق:</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-green-700 font-bold">
                <span>المدفوع:</span>
                <span>+{formatCurrency(order.totalPaid)}</span>
              </div>
              <div className="flex justify-between font-bold text-red-600">
                <span>المتبقي:</span>
                <span>{formatCurrency(order.remainingBalance)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal with SMART GUARD (Cannot exceed remaining balance) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`تسجيل إكمال دفع للفاتورة ${order.orderNumber}`}
      >
        <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
          <div className="flex flex-col gap-1.5 w-full">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#374151] dark:text-slate-300">
                مبلغ الدفعة (د.ل) <span className="text-[#EF4444]">*</span>
              </label>
              {order.remainingBalance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPayAmount(order.remainingBalance.toString());
                    setPaymentFormError('');
                  }}
                  className="text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-lg cursor-pointer hover:bg-[#BBF7D0] transition-colors"
                >
                  تعبئة الباقي كاملاً ({order.remainingBalance} د.ل)
                </button>
              )}
            </div>
            <input
              type="number"
              min="0.01"
              max={order.remainingBalance}
              step="0.01"
              value={payAmount}
              onChange={(e) => {
                setPayAmount(e.target.value);
                setPaymentFormError('');
              }}
              required
              className="ui-input"
            />
            <p className="text-xs text-[#6B7280] font-tajawal">
              المبلغ المتبقي المطلوب دفعه هو: <strong className="text-[#EF4444]">{order.remainingBalance} د.ل</strong> (النظام ينبهك يمنع زيادة مال أكثر من الباقي).
            </p>
          </div>

          <Input label="تاريخ الدفع (امتى دفع)" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} required />
          <Select label="طريقة الدفع" options={['Cash', 'Bank Transfer', 'Card']} value={payMethod} onChange={(val) => setPayMethod(val)} required />
          <Select label="الموظف المستلم" options={employees} value={payEmpId} onChange={(val) => setPayEmpId(val)} required />

          {paymentFormError && (
            <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-xs font-bold text-[#EF4444] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{paymentFormError}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)} disabled={isPaymentSubmitting}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={isPaymentSubmitting}>
              حفظ الدفعة
            </Button>
          </div>
        </form>
      </Modal>

      {/* Item Exception Modal (إضافة استثناء / قطعة لم ترجع) */}
      <Modal
        isOpen={isExceptionModalOpen}
        onClose={() => setIsExceptionModalOpen(false)}
        title="إضافة استثناء (تحديد قطعة لم ترجع)"
      >
        <form onSubmit={handleSaveException} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#374151] dark:text-slate-300">
              اختر القطعة التي لم ترجع <span className="text-[#EF4444]">*</span>
            </label>
            <select
              value={selectedExceptionItem?.id || ''}
              onChange={(e) => {
                const found = order.items.find((i: any) => i.id === e.target.value);
                setSelectedExceptionItem(found || null);
              }}
              className="ui-input"
              required
            >
              {order.items.map((i: any) => (
                <option key={i.id} value={i.id}>
                  {i.category} ({i.quantity} قطعة) - حالة التسليم: {translateDeliveryStatus(i.status)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#374151] dark:text-slate-300">
              ملاحظة الاستثناء (سبب عدم الإرجاع / التلف) <span className="text-[#EF4444]">*</span>
            </label>
            <textarea
              value={exceptionNotes}
              onChange={(e) => setExceptionNotes(e.target.value)}
              rows={3}
              required
              placeholder="مثال: لم ترجع القبعة، أو ضاع البروش..."
              className="ui-input h-24 p-3"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsExceptionModalOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" isLoading={isReturnSubmitting}>
              حفظ الاستثناء
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default OrderDetails;
