import React, { useEffect, useState } from 'react';
import { 
  FileText, Coins, ArrowLeftRight, User, Printer, Trash2, 
  Plus, RotateCcw, AlertCircle, Calendar, Phone, Check, RefreshCw, EyeOff, Edit, MessageCircle, ArrowLeft
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
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState('');

  const [retQty, setRetQty] = useState('');
  const [retDate, setRetDate] = useState(new Date().toISOString().split('T')[0]);
  const [retCondition, setRetCondition] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [retNotes, setRetNotes] = useState('');
  const [retEmpId, setRetEmpId] = useState('');
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  const [returnFormError, setReturnFormError] = useState('');

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
      if (isReturnModalOpen) setRetEmpId(activeEmployee.id);
    }
  }, [isPaymentModalOpen, isReturnModalOpen, activeEmployee]);

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
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">حدث خطأ</h3>
        <p className="text-sm text-slate-500 font-medium">{error}</p>
        <Button variant="secondary" onClick={onBack}>الرجوع للفواتير</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="no-print space-y-8">
        
        {/* 1. VISUAL PRIORITY: HEADER (Invoice Number, Payment Status, Outstanding Balance) */}
        <div className="ui-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={onBack}
                className="p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                title="رجوع"
              >
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
              
              {/* Priority 1: Invoice Number */}
              <h1 className="text-3xl font-bold font-cairo text-[#111827] dark:text-white tracking-tight">
                فاتورة رقم {order.orderNumber}
              </h1>

              {/* Priority 2: Payment Status Badge */}
              <span className={`ui-badge text-xs px-3.5 py-1 rounded-full ${
                order.paymentStatus === 'FullyPaid' ? 'bg-[#DCFCE7] text-[#15803D]' :
                order.paymentStatus === 'PartiallyPaid' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                'bg-[#FEF3C7] text-[#B45309]'
              }`}>
                {translatePaymentStatus(order.paymentStatus)}
              </span>
            </div>
            
            <p className="text-xs text-[#6B7280] font-normal font-tajawal pr-11">
              تاريخ الإنشاء: {formatDate(order.orderDate)} | الموظف المسؤول: {order.employee?.name || 'غير مخصص'}
            </p>
          </div>

          {/* Priority 3: Outstanding Balance & Primary CTA */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-[#ECEEF2] dark:border-slate-800">
            <div className="text-right sm:text-left">
              <span className="text-xs font-medium text-[#6B7280] font-tajawal block">المتبقي بذمة الزبون</span>
              <h2 className={`text-2xl font-bold font-cairo mt-0.5 ${
                order.remainingBalance > 0 ? 'text-[#EF4444]' : 'text-[#16A34A]'
              }`}>
                {formatCurrency(order.remainingBalance)}
              </h2>
            </div>

            {/* DOMINANT PRIMARY BUTTON (Only ONE dominant button on the page) */}
            <Button 
              variant="primary" 
              size="md" 
              icon={<Plus className="w-5 h-5" />} 
              onClick={() => { setPaymentFormError(''); setIsPaymentModalOpen(true); }}
            >
              تسجيل دفعة جديدة
            </Button>
          </div>
        </div>

        {/* Action Toolbar (Secondary Buttons Only) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4 text-[#6B7280]" />} onClick={() => triggerPrint('invoice')}>
              طباعة الفاتورة
            </Button>
            <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4 text-[#6B7280]" />} onClick={() => triggerPrint('rental')}>
              طباعة عقد الإيجار
            </Button>
            <Button variant="secondary" size="sm" icon={<Edit className="w-4 h-4 text-[#6B7280]" />} onClick={() => onNavigate('orders', { editId: order.id })}>
              تعديل بيانات الفاتورة
            </Button>
          </div>

          <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={handleDeleteOrder}>
            حذف الفاتورة
          </Button>
        </div>

        {/* Main Grid: Left Column (Products & Payments) | Right Column (Customer & Financial Summary) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Priority 5: PRODUCTS SECTION (Structured Cards) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-22 font-bold font-cairo text-[#111827] dark:text-white">
                  القطع والمنتجات ({order.items.length})
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#6B7280] font-medium font-tajawal">تغيير الحالة العامة:</span>
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-[#ECEEF2] dark:border-slate-800 p-1 rounded-2xl">
                    {['Preparing', 'Ready', 'Delivered', 'Completed'].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateOrderStatus(st)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold font-tajawal transition-all ${
                          order.status === st ? 'bg-[#16A34A] text-white shadow-xs' : 'text-[#6B7280] hover:text-[#111827]'
                        }`}
                      >
                        {translateStatus(st)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Product Cards List */}
              <div className="space-y-4">
                {order.items.map((item: any) => (
                  <div key={item.id} className="ui-card space-y-4">
                    {/* Header: Name & Type */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#111827] dark:text-white font-cairo">
                          {item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category}
                        </h3>
                        
                        {/* Small Metadata Chips */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {item.operationType && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-[#F3F4F6] text-[#374151] dark:bg-slate-800 dark:text-slate-300">
                              {item.operationType === 'Rental' ? 'إيجار' : 'بيع'}
                            </span>
                          )}
                          {item.capType && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-800">
                              النوع: {item.capType === 'Other' ? item.customCapType : item.capType}
                            </span>
                          )}
                          {item.capSize && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-800">
                              القياس: {item.capSize === 'Other' ? item.customCapSize : item.capSize}
                            </span>
                          )}
                          {item.capColor && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-800">
                              اللون: {item.capColor === 'Other' ? item.customCapColor : item.capColor}
                            </span>
                          )}
                          {item.saleType && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-800">
                              ستايل: {item.saleType}
                            </span>
                          )}
                          {item.broochType && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-[#F3F4F6] text-[#4B5563] dark:bg-slate-800">
                              بروش: {item.broochType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`ui-badge text-xs px-3 py-1 rounded-full ${
                        item.status === 'Delivered' ? 'bg-[#DCFCE7] text-[#15803D]' :
                        item.status === 'Ready' ? 'bg-[#E0F2FE] text-[#0369A1]' :
                        item.status === 'Returned' ? 'bg-[#F3E8FF] text-[#6B21A8]' :
                        'bg-[#FEF3C7] text-[#B45309]'
                      }`}>
                        {translateDeliveryStatus(item.status)}
                      </span>
                    </div>

                    <div className="border-t border-[#ECEEF2] dark:border-slate-800" />

                    {/* Quantity, Unit Price & Subtotal */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-tajawal">
                      <div>
                        <span className="text-xs text-[#6B7280] font-medium block">الكمية والسعر</span>
                        <span className="text-[17px] font-semibold font-cairo text-[#111827] dark:text-white mt-0.5 block">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-[#6B7280] font-medium block">تاريخ التسليم</span>
                        <span className="text-sm font-semibold font-tajawal text-[#374151] dark:text-slate-200 mt-0.5 block">
                          {formatDate(item.deliveryDate)}
                        </span>
                      </div>

                      <div>
                        <span className="text-xs text-[#6B7280] font-medium block">إجمالي القطعة</span>
                        <span className="text-[17px] font-semibold font-cairo text-[#16A34A] mt-0.5 block">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </span>
                      </div>
                    </div>

                    {item.operationType === 'Rental' && (
                      <div className="p-3.5 bg-[#F9FAFB] dark:bg-[#0B0F17] rounded-xl border border-[#ECEEF2] dark:border-slate-800 flex items-center justify-between text-xs font-tajawal">
                        <span className="font-medium text-[#4B5563] dark:text-slate-300">
                          تأمين الإيجار: <strong className="text-[#111827] dark:text-white font-cairo">{formatCurrency(item.depositAmount * item.quantity)}</strong> (مسترد عند التسليم السليم)
                        </span>

                        {item.status !== 'Returned' ? (
                          <button
                            onClick={() => {
                              setSelectedReturnItem(item);
                              setReturnFormError('');
                              setRetQty(item.quantity.toString());
                              setIsReturnModalOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-[#F59E0B] hover:bg-[#D97706] text-white rounded-xl text-xs font-bold transition-all"
                          >
                            تسجيل إرجاع
                          </button>
                        ) : (
                          <span className="font-bold text-[#16A34A] flex items-center gap-1">
                            <Check className="w-4 h-4" /> تم الإرجاع بالكامل
                          </span>
                        )}
                      </div>
                    )}

                    <div className="border-t border-[#ECEEF2] dark:border-slate-800" />

                    {/* Inline Delivery Action Trigger */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#6B7280] font-medium font-tajawal">تحديث تسليم القطعة:</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Waiting')}
                          className={`px-3 py-1 rounded-xl font-semibold transition-all ${
                            item.status === 'Waiting' ? 'bg-[#374151] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          انتظار
                        </button>
                        <button
                          onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Ready')}
                          className={`px-3 py-1 rounded-xl font-semibold transition-all ${
                            item.status === 'Ready' ? 'bg-[#0284C7] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          جاهز
                        </button>
                        <button
                          onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Delivered')}
                          className={`px-3 py-1 rounded-xl font-semibold transition-all ${
                            item.status === 'Delivered' ? 'bg-[#16A34A] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
                          }`}
                        >
                          تسليم
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority 6: PAYMENTS TABLE */}
            <div className="ui-panel space-y-4">
              <h2 className="text-22 font-bold font-cairo text-[#111827] dark:text-white pb-3 border-b border-[#ECEEF2] dark:border-slate-800">
                سجل المقبوضات والدفعات
              </h2>

              <div className="overflow-x-auto rounded-xl border border-[#ECEEF2] dark:border-slate-800">
                <table className="w-full text-right border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#ECEEF2] dark:border-slate-800 bg-[#F9FAFB] dark:bg-[#0B0F17] text-[#6B7280]">
                      <th className="py-3.5 px-4 font-bold font-tajawal">تاريخ الاستلام</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal">الموظف المستلم</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal">طريقة الدفع</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal">القيمة</th>
                      <th className="py-3.5 px-4 font-bold font-tajawal text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEEF2] dark:divide-slate-800">
                    {order.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-[#F9FAFB] dark:hover:bg-slate-800/40 transition-colors h-14">
                        <td className="py-4 px-4 font-medium text-[#374151] dark:text-slate-300 font-tajawal">{formatDate(p.paymentDate)}</td>
                        <td className="py-4 px-4 font-semibold text-[#111827] dark:text-white">{p.employee?.name || '---'}</td>
                        <td className="py-4 px-4 font-medium text-[#6B7280] font-tajawal">{p.paymentMethod}</td>
                        <td className="py-4 px-4 font-bold text-[#16A34A] font-cairo">{formatCurrency(p.amount)}</td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p.id, p.amount)}
                              className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg transition-colors"
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
            
            {/* Priority 4: CUSTOMER CARD */}
            <div className="ui-card space-y-4">
              <h3 className="text-lg font-bold text-[#111827] dark:text-white border-b border-[#ECEEF2] dark:border-slate-800 pb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-[#16A34A]" />
                بيانات الزبون
              </h3>

              <div className="space-y-3">
                <h4 
                  className="text-lg font-bold text-[#16A34A] hover:underline cursor-pointer"
                  onClick={() => onNavigate('customer-profile', { id: order.customerId })}
                >
                  {order.customer?.name}
                </h4>
                
                <div className="flex items-center justify-between gap-2 p-3 bg-[#F9FAFB] dark:bg-[#0B0F17] rounded-xl border border-[#ECEEF2] dark:border-slate-800 text-sm font-tajawal">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[#9CA3AF]" />
                    <span className="font-semibold text-[#374151] dark:text-slate-200">{order.customer?.phone}</span>
                  </div>
                  {order.customer?.phone && order.customer?.phone !== '/' && (
                    <a
                      href={getWhatsAppLink(order.customer.phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#DCFCE7] text-[#15803D] rounded-xl text-xs font-bold hover:bg-[#BBF7D0] transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>تواصل</span>
                    </a>
                  )}
                </div>

                {order.customer?.notes && (
                  <div className="p-3 bg-[#F9FAFB] dark:bg-[#0B0F17] rounded-xl text-xs text-[#6B7280] font-tajawal border border-[#ECEEF2] dark:border-slate-800">
                    <span className="font-bold block text-[#374151] dark:text-slate-300">ملاحظات دائمية:</span>
                    <p className="mt-1 leading-relaxed">{order.customer.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* FINANCIAL PAYMENT WIDGET (Clean Separators, Highlighted Remaining Balance) */}
            <div className="ui-card space-y-4">
              <h3 className="text-lg font-bold text-[#111827] dark:text-white border-b border-[#ECEEF2] dark:border-slate-800 pb-3">
                الملخص المالي للفاتورة
              </h3>

              <div className="space-y-3.5 text-sm font-tajawal">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B7280] font-medium">المجموع الفرعي:</span>
                  <span className="font-semibold text-[#111827] dark:text-white font-cairo text-[17px]">{formatCurrency(order.subtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-[#EF4444]">
                  <span className="font-medium">الخصم:</span>
                  <span className="font-semibold font-cairo text-[17px]">-{formatCurrency(order.discount)}</span>
                </div>

                <div className="border-t border-[#ECEEF2] dark:border-slate-800 pt-3 flex justify-between items-center">
                  <span className="font-bold text-[#111827] dark:text-white">الإجمالي المستحق:</span>
                  <span className="font-bold font-cairo text-lg text-[#111827] dark:text-white">{formatCurrency(order.grandTotal)}</span>
                </div>

                <div className="flex justify-between items-center text-[#16A34A]">
                  <span className="font-medium">المدفوع:</span>
                  <span className="font-semibold font-cairo text-[17px]">+{formatCurrency(order.totalPaid)}</span>
                </div>

                {/* HIGHLIGHTED REMAINING BALANCE */}
                <div className={`border-t-2 border-[#ECEEF2] dark:border-slate-800 pt-3.5 flex justify-between items-center p-3 rounded-xl ${
                  order.remainingBalance > 0 ? 'bg-[#FEF2F2] dark:bg-rose-950/30' : 'bg-[#F0FDF4] dark:bg-emerald-950/30'
                }`}>
                  <span className="font-bold text-sm">المتبقي المطلوب:</span>
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

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`تسجيل دفعة جديدة للفاتورة ${order.orderNumber}`}
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
                  onClick={() => setPayAmount(order.remainingBalance.toString())}
                  className="text-xs font-bold text-[#16A34A] bg-[#DCFCE7] px-2.5 py-1 rounded-lg"
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

          {paymentFormError && <p className="text-xs text-[#EF4444] font-bold">{paymentFormError}</p>}

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

            {returnFormError && <p className="text-xs text-[#EF4444] font-bold">{returnFormError}</p>}

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
