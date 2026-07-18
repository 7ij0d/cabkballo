import React, { useEffect, useState } from 'react';
import { 
  FileText, Coins, ArrowLeftRight, User, Printer, Trash2, 
  Plus, RotateCcw, AlertCircle, Calendar, Phone, Check, RefreshCw, EyeOff 
} from 'lucide-react';
import { orderService, paymentService, returnService } from '../services/api';
import { formatCurrency, formatDate, translateStatus, translatePaymentStatus, translateDeliveryStatus, translateCondition } from '../utils/arabic';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/Modal';

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

  // Modal control
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedReturnItem, setSelectedReturnItem] = useState<any | null>(null);

  // Add Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('');
  const [customPayMethod, setCustomPayMethod] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payEmpId, setPayEmpId] = useState('');
  const [customPayEmp, setCustomPayEmp] = useState('');
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentFormError, setPaymentFormError] = useState('');

  // Return Product Form
  const [retQty, setRetQty] = useState('');
  const [retDate, setRetDate] = useState(new Date().toISOString().split('T')[0]);
  const [retCondition, setRetCondition] = useState('');
  const [customCondition, setCustomCondition] = useState('');
  const [retNotes, setRetNotes] = useState('');
  const [retEmpId, setRetEmpId] = useState('');
  const [customRetEmp, setCustomRetEmp] = useState('');
  const [isReturnSubmitting, setIsReturnSubmitting] = useState(false);
  const [returnFormError, setReturnFormError] = useState('');

  // Active print template details
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

  // Set default employee receiver on opening modals
  useEffect(() => {
    if (activeEmployee) {
      if (isPaymentModalOpen) {
        setPayEmpId(activeEmployee.id);
      }
      if (isReturnModalOpen) {
        setRetEmpId(activeEmployee.id);
      }
    }
  }, [isPaymentModalOpen, isReturnModalOpen, activeEmployee]);

  const handleUpdateOrderStatus = async (status: string) => {
    try {
      await orderService.update(orderId, { status });
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
      alert('فشل تعديل حالة الطلب.');
    }
  };

  const handleUpdateItemDeliveryStatus = async (itemId: string, status: string) => {
    try {
      await orderService.updateItemStatus(itemId, status);
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
      alert('فشل تعديل حالة تسليم المنتج.');
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
      // Reset Form
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
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه الفاتورة بالكامل؟ لا يمكن التراجع عن هذا الإجراء.')) {
      try {
        await orderService.delete(orderId);
        onBack();
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء حذف الفاتورة.');
      }
    }
  };

  const triggerPrint = (type: 'invoice' | 'receipt' | 'rental' | 'return', data?: any) => {
    setPrintType(type);
    if (type === 'receipt') setPrintPaymentData(data);
    if (type === 'return') setPrintReturnData(data);
    
    // Give state time to update print layout, then print
    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse py-6">
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
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 p-6 rounded-2xl text-center max-w-xl mx-auto space-y-3 mt-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-red-800 dark:text-red-400">حدث خطأ</h3>
        <p className="text-sm text-red-650 dark:text-red-300 font-semibold">{error}</p>
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all"
        >
          رجوع
        </button>
      </div>
    );
  }

  // Employee option mapping
  const employeeNames = [
    { value: 'f3a479b1-e221-4f19-a1b7-d15764d2d46e', label: 'أنس' },
    { value: 'a98f5c9e-5b12-4c28-98e3-f8a183d2d2a4', label: 'طه' }
  ];

  return (
    <div className="space-y-6">
      
      {/* 1. Main UI (Hidden when printing via .no-print helper) */}
      <div className="no-print space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-200 rounded-xl transition-all shadow-sm flex items-center"
            >
              <ArrowLeftRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 font-cairo">
                  فاتورة تخرج: {order.orderNumber}
                </h1>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  order.paymentStatus === 'FullyPaid' ? 'bg-emerald-50 text-emerald-600' :
                  order.paymentStatus === 'PartiallyPaid' ? 'bg-blue-50 text-blue-650' :
                  'bg-orange-50 text-orange-655'
                }`}>
                  {translatePaymentStatus(order.paymentStatus)}
                </span>
              </div>
              <p className="text-xs text-slate-450 dark:text-slate-555 font-bold font-tajawal mt-0.5">
                تاريخ الطلب: {formatDate(order.orderDate)} | الموظف المسؤول: {order.employee.name}
              </p>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => triggerPrint('invoice')}
            >
              طباعة الفاتورة
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer className="w-3.5 h-3.5" />}
              onClick={() => triggerPrint('rental')}
            >
              طباعة عقد الإيجار
            </Button>
            <Button
              variant="success"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setPaymentFormError('');
                setIsPaymentModalOpen(true);
              }}
            >
              تسجيل دفعة جديدة
            </Button>
            <button
              onClick={handleDeleteOrder}
              className="p-2 text-slate-400 hover:text-red-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
              title="حذف الفاتورة بالكامل"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* General Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main invoice table & products */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Products Table Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                <span>قائمة المنتجات والقطع الفردية</span>
                <span className="text-[10px] text-slate-400 font-bold font-tajawal">عدد العناصر: {order.items.length}</span>
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {order.items.map((item: any) => (
                  <div key={item.id} className="py-4 space-y-3">
                    
                    {/* Item header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                          {item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category}
                        </h4>
                        
                        {/* Sub attributes descriptions */}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-tajawal font-medium">
                          {item.capType && (
                            <span>النوع: {item.capType === 'Other' ? (item.customCapType || 'أخرى') : item.capType}</span>
                          )}
                          {item.capSize && (
                            <span>القياس: {item.capSize === 'Other' ? (item.customCapSize || 'أخرى') : item.capSize}</span>
                          )}
                          {item.capColor && (
                            <span>اللون: {item.capColor === 'Other' ? (item.customCapColor || 'أخرى') : item.capColor}</span>
                          )}
                          {item.operationType && (
                            <span className="font-bold text-brand-600 dark:text-brand-400">
                              [{item.operationType === 'Rental' ? 'إيجار' : 'بيع'}]
                            </span>
                          )}
                          {item.saleType && (
                            <span>ستايل: {item.saleType === 'Other' ? (item.customSaleType || 'أخرى') : item.saleType}</span>
                          )}
                          {item.broochType && (
                            <span>نوع البروش: {item.broochType === 'Other' ? (item.customBroochType || 'أخرى') : item.broochType}</span>
                          )}
                          {item.accessoryName && (
                            <span>إكسسوار: {item.accessoryName}</span>
                          )}
                          {item.deliveryDate && (
                            <span>تسليم: {formatDate(item.deliveryDate)}</span>
                          )}
                          {item.returnDate && (
                            <span>إرجاع متوقع: {formatDate(item.returnDate)}</span>
                          )}
                          {item.graduationDate && (
                            <span>التخرج: {formatDate(item.graduationDate)}</span>
                          )}
                        </div>
                      </div>

                      {/* Prices & Subtotals */}
                      <div className="text-left font-cairo">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-350">
                          {item.quantity} × {formatCurrency(item.unitPrice)}
                        </span>
                        <div className="text-sm font-black text-slate-850 dark:text-slate-100 mt-0.5">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                      </div>
                    </div>

                    {/* Rented deposit & Return buttons */}
                    {item.operationType === 'Rental' && (
                      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-150/40 dark:border-slate-850/50">
                        <span className="text-[10px] font-bold text-slate-550 dark:text-slate-400 font-tajawal">
                          تأمين الإيجار: {formatCurrency(item.depositAmount * item.quantity)} (مسترد بالكامل عند الإرجاع السليم)
                        </span>
                        
                        {item.status !== 'Returned' ? (
                          <button
                            onClick={() => {
                              setSelectedReturnItem(item);
                              setReturnFormError('');
                              setRetQty(item.quantity.toString());
                              setIsReturnModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                          >
                            تسجيل إرجاع المنتج (Return Product)
                          </button>
                        ) : (
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            تم إرجاع المنتج بالكامل
                          </span>
                        )}
                      </div>
                    )}

                    {/* Delivery Status Controllers */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400 font-bold font-tajawal">حالة تسليم القطعة:</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                          item.status === 'Ready' ? 'bg-blue-50 text-blue-650' :
                          item.status === 'Returned' ? 'bg-purple-50 text-purple-650' :
                          'bg-orange-50 text-orange-655'
                        }`}>
                          {translateDeliveryStatus(item.status)}
                        </span>
                      </div>

                      {/* Dropdown status update for employee convenience */}
                      {item.status !== 'Returned' && (
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg">
                          <button
                            onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Waiting')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                              item.status === 'Waiting' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-650'
                            }`}
                          >
                            انتظار
                          </button>
                          <button
                            onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Ready')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                              item.status === 'Ready' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-655'
                            }`}
                          >
                            جاهز
                          </button>
                          <button
                            onClick={() => handleUpdateItemDeliveryStatus(item.id, 'Delivered')}
                            className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all ${
                              item.status === 'Delivered' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-emerald-600'
                            }`}
                          >
                            تسليم
                          </button>
                        </div>
                      )}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-400 bg-slate-50/40 p-2 rounded border border-dashed border-slate-200 mt-2 font-tajawal">
                        ملاحظات السطر: {item.notes}
                      </p>
                    )}

                  </div>
                ))}
              </div>
            </div>

            {/* Payments Ledger Sub-table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                سجل الدفعات المقبوضة
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400">
                      <th className="py-2.5 px-3 font-bold font-tajawal">التاريخ</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">الموظف المستلم</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">طريقة الدفع</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">ملاحظات</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">القيمة</th>
                      <th className="py-2.5 px-3 font-bold font-tajawal">وصل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {order.payments.map((p: any) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-3 px-3 font-semibold text-slate-500 font-tajawal">{formatDate(p.paymentDate)}</td>
                        <td className="py-3 px-3 font-semibold text-slate-655 dark:text-slate-400">{p.employee?.name || '---'}</td>
                        <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-350 font-tajawal">{p.paymentMethod}</td>
                        <td className="py-3 px-3 font-semibold text-slate-400 dark:text-slate-500 font-tajawal">{p.notes || '---'}</td>
                        <td className="py-3 px-3 font-black text-emerald-650 dark:text-emerald-450 font-cairo">{formatCurrency(p.amount)}</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => triggerPrint('receipt', p)}
                            className="p-1 text-slate-400 hover:text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-850 rounded"
                            title="طباعة إيصال الدفعة"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {order.payments.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-450 dark:text-slate-600 font-tajawal">
                          لا يوجد حركات قبض مسجلة لهذه الفاتورة حتى الآن.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Sidebar calculations & customer info */}
          <div className="space-y-6">
            
            {/* Customer Personal profile */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-bl from-luxury-gold/10 to-transparent rounded-full" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-brand-600" />
                ملف الزبون
              </h3>

              <div className="mt-3.5 space-y-2">
                <h4 
                  className="text-sm font-black text-brand-600 dark:text-brand-400 hover:underline cursor-pointer flex items-center gap-1"
                  onClick={() => onNavigate('customer-profile', { id: order.customerId })}
                >
                  {order.customer.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-tajawal">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{order.customer.phone}</span>
                </div>
                {order.customer.notes && (
                  <div className="bg-slate-50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-500 font-tajawal mt-2">
                    <span className="font-bold text-slate-455 block">عن الزبون:</span>
                    <p className="mt-0.5 leading-relaxed">{order.customer.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Ledger totals details */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                الحسابات التفصيلية
              </h3>

              <div className="space-y-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 font-tajawal">
                <div className="flex justify-between">
                  <span>المجموع الفرعي:</span>
                  <span className="font-black text-slate-850 dark:text-slate-100 font-cairo">{formatCurrency(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span>الخصم:</span>
                  <span className="font-black font-cairo">-{formatCurrency(order.discount)}</span>
                </div>
                <div className="flex justify-between pt-2.5 border-t border-slate-100 dark:border-slate-850 text-slate-800 dark:text-slate-200">
                  <span>المجموع المستحق الإجمالي:</span>
                  <span className="font-black text-sm font-cairo">{formatCurrency(order.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>المقبووض (المدفوع):</span>
                  <span className="font-black font-cairo">+{formatCurrency(order.totalPaid)}</span>
                </div>
                <div className={`flex justify-between pt-2 border-t border-slate-100 dark:border-slate-850 ${
                  order.remainingBalance > 0 ? 'text-red-655 font-black text-sm' : 'text-slate-400'
                }`}>
                  <span>المتبقي المطلوب:</span>
                  <span className="font-black font-cairo">{formatCurrency(order.remainingBalance)}</span>
                </div>
              </div>
            </div>

            {/* Status updates router */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-3.5">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                إدارة حالة الفاتورة العامة
              </h3>

              <div className="flex flex-wrap gap-1.5">
                {['Pending', 'Preparing', 'Ready', 'Delivered', 'Completed', 'Cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateOrderStatus(st)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                      order.status === st 
                        ? 'bg-brand-600 border-brand-600 text-white shadow-sm' 
                        : 'bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
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

      {/* 2. PRINT TEMPLATES (Shown ONLY when printing via print media styles) */}
      <div className="print-only block">
        {printType === 'invoice' && (
          // A. INVOICE PRINT
          <div className="p-8 space-y-6 max-w-3xl mx-auto text-slate-900 leading-relaxed font-cairo select-text">
            {/* Header info */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl font-black tracking-wide">متجر التخرج للمستلزمات</h1>
                <p className="text-xs text-slate-500 font-bold mt-1">طرابلس، ليبيا | هاتف: 0912345678</p>
                <p className="text-xs text-slate-500 font-bold mt-0.5">تأجير وبيع ملابس ومستلزمات حفلات التخرج</p>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-bold text-brand-600">فاتورة حساب رقم: {order.orderNumber}</h2>
                <p className="text-xs text-slate-500 mt-1">تاريخ الفاتورة: {formatDate(order.orderDate)}</p>
                <p className="text-xs text-slate-500">الموظف: {order.employee.name}</p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="bg-slate-100 p-4 rounded-xl space-y-1">
              <h3 className="text-xs font-bold text-slate-500">صادرة إلى السيد(ة):</h3>
              <p className="text-sm font-black">{order.customer.name}</p>
              <p className="text-xs font-bold text-slate-600 font-tajawal">هاتف الزبون: {order.customer.phone}</p>
            </div>

            {/* Items List table */}
            <table className="w-full text-right border-collapse text-xs mt-4">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-700">
                  <th className="py-2.5 px-3 font-bold">اسم المنتج وتفاصيله</th>
                  <th className="py-2.5 px-3 font-bold text-center">الكمية</th>
                  <th className="py-2.5 px-3 font-bold text-left">سعر القطعة</th>
                  <th className="py-2.5 px-3 font-bold text-left">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 px-3">
                      <div className="font-bold">
                        {item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.capType && `نوع: ${item.capType} `}
                        {item.capSize && `قياس: ${item.capSize} `}
                        {item.capColor && `لون: ${item.capColor} `}
                        {item.operationType && `[${item.operationType === 'Rental' ? 'إيجار' : 'بيع'}] `}
                        {item.saleType && `موديل: ${item.saleType} `}
                        {item.notes && `(${item.notes})`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-left font-bold">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-left font-bold">{formatCurrency(item.quantity * item.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="w-1/2 mr-auto space-y-1.5 border-t border-slate-900 pt-3 text-xs">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-red-650">
                <span>خصم خاص:</span>
                <span className="font-bold">-{formatCurrency(order.discount)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 font-black text-sm">
                <span>المجموع الإجمالي المستحق:</span>
                <span>{formatCurrency(order.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>المدفوع (المحصل):</span>
                <span>+{formatCurrency(order.totalPaid)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1.5 font-black text-red-600">
                <span>المتبقي المطلوب:</span>
                <span>{formatCurrency(order.remainingBalance)}</span>
              </div>
            </div>

            {/* Invoice footer terms */}
            <div className="pt-8 text-center border-t border-slate-200 space-y-2">
              <p className="text-[10px] text-slate-400 font-bold">
                شكرًا لتعاملكم معنا. يرجى مراجعة القطع عند الاستلام مباشرة.
              </p>
              <div className="flex justify-around pt-6 text-[10px] font-bold text-slate-500">
                <div className="border-t border-slate-900 w-24 pt-1">توقيع المستلم</div>
                <div className="border-t border-slate-900 w-24 pt-1">توقيع إدارة المعرض</div>
              </div>
            </div>

          </div>
        )}

        {printType === 'rental' && (
          // B. RENTAL CONTRACT PRINT
          <div className="p-8 space-y-6 max-w-3xl mx-auto text-slate-900 leading-relaxed font-cairo select-text">
            <div className="text-center border-b-2 border-slate-900 pb-4">
              <h1 className="text-2xl font-black">عقد وإيصال إيجار مستلزمات تخرج</h1>
              <p className="text-xs text-slate-500 font-bold mt-1">متجر التخرج للمستلزمات | هاتف: 0912345678</p>
              <p className="text-xs font-bold mt-0.5">الرقم المرجعي للفاتورة: {order.orderNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-100 p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-bold">بيانات المستأجر:</span>
                <p className="font-black text-sm">{order.customer.name}</p>
                <p className="font-bold text-slate-655">الهاتف: {order.customer.phone}</p>
              </div>
              <div className="bg-slate-100 p-3.5 rounded-xl space-y-1">
                <span className="text-[10px] text-slate-500 font-bold">بيانات العقد:</span>
                <p className="font-bold">المسؤول: {order.employee.name}</p>
                <p className="font-bold text-slate-655">تاريخ التحرير: {formatDate(new Date())}</p>
              </div>
            </div>

            <h3 className="text-xs font-black bg-slate-900 text-white p-2 rounded">المنتجات المؤجرة والتأمين المستلم</h3>
            
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-50">
                  <th className="py-2.5 px-3 font-bold">المنتج المؤجر</th>
                  <th className="py-2.5 px-3 font-bold text-center">الكمية</th>
                  <th className="py-2.5 px-3 font-bold text-left">قيمة الإيجار</th>
                  <th className="py-2.5 px-3 font-bold text-left">مبلغ التأمين للقطعة</th>
                  <th className="py-2.5 px-3 font-bold">تاريخ الإرجاع المتوقع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {order.items.filter((item: any) => item.operationType === 'Rental').map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td className="py-3 px-3">
                      <div className="font-bold">
                        {item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.capType && `نوع: ${item.capType} `}
                        {item.capSize && `قياس: ${item.capSize} `}
                        {item.notes && `(${item.notes})`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-3 px-3 text-left font-bold">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-3 px-3 text-left font-bold">{formatCurrency(item.depositAmount)}</td>
                    <td className="py-3 px-3 font-bold">{formatDate(item.returnDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Terms and conditions */}
            <div className="border border-slate-200 p-4 rounded-xl text-[10px] text-slate-600 space-y-1.5 leading-relaxed font-tajawal">
              <h4 className="font-black text-slate-900 text-xs">شروط التزام المستأجر:</h4>
              <p>1. يلتزم المستأجر بإرجاع القطع المؤجرة في الموعد المحدد في العقد أعلاه.</p>
              <p>2. يتم استرداد مبلغ التأمين بالكامل عند تسليم القطعة بحالتها السليمة الممتازة دون تلف أو حروق أو بقع غير قابلة للإزالة.</p>
              <p>3. في حالة تأخر الإرجاع عن الموعد المحدد، يخصم مبلغ 10.00 د.ل عن كل يوم تأخير للقطعة الواحدة.</p>
              <p>4. في حالة ضياع القطعة أو تلفها بالكامل، لا يحق للمستأجر المطالبة بمبلغ التأمين ويغرم قيمة التعويض عن شراء قطعة جديدة.</p>
            </div>

            <div className="flex justify-around pt-10 text-[10px] font-bold text-slate-500">
              <div className="border-t border-slate-900 w-32 pt-1.5 text-center">توقيع المستأجر المقر بالشروط</div>
              <div className="border-t border-slate-900 w-32 pt-1.5 text-center">توقيع موظف المعرض</div>
            </div>
          </div>
        )}

        {printType === 'receipt' && printPaymentData && (
          // C. PAYMENT RECEIPT PRINT
          <div className="p-8 space-y-6 max-w-md mx-auto text-slate-900 leading-relaxed font-cairo select-text border border-slate-200 rounded-2xl shadow-inner mt-12">
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <h2 className="text-lg font-black">وصل قبض دفعة مالية</h2>
              <p className="text-[10px] text-slate-500 font-bold">متجر التخرج للمستلزمات | هاتف: 0912345678</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>تاريخ القبض:</span>
                <span className="font-bold">{formatDate(printPaymentData.paymentDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>رقم الفاتورة الأصلي:</span>
                <span className="font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>اسم الزبون:</span>
                <span className="font-black text-brand-600">{order.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع:</span>
                <span className="font-bold">{printPaymentData.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span>الموظف المقر بالاستلام:</span>
                <span className="font-bold">{printPaymentData.employee?.name}</span>
              </div>
              {printPaymentData.notes && (
                <div className="flex justify-between border-t border-dashed border-slate-200 pt-1.5">
                  <span>ملاحظات الدفعة:</span>
                  <span className="font-medium text-slate-500">{printPaymentData.notes}</span>
                </div>
              )}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 p-4 rounded-xl text-center">
              <span className="text-[10px] font-bold text-emerald-600 block">القيمة المقبوضة المستلمة</span>
              <h2 className="text-2xl font-black text-emerald-800 dark:text-emerald-350 mt-1">
                {formatCurrency(printPaymentData.amount)}
              </h2>
            </div>

            {/* Outstanding balances reminder */}
            <div className="pt-2 text-center text-[10px] font-bold text-slate-400 font-tajawal">
              المتبقي في ذمة الزبون لهذه الفاتورة: {formatCurrency(order.remainingBalance)}
            </div>

            <div className="flex justify-around pt-6 text-[10px] font-bold text-slate-500">
              <div className="border-t border-slate-900 w-20 pt-1 text-center">توقيع المستلم</div>
            </div>
          </div>
        )}
      </div>

      {/* Add Payment Modal Popup */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`تسجيل دفعة قبض للفاتورة ${order.orderNumber}`}
      >
        <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
          <Input
            label="قيمة المبلغ المقبوض (د.ل)"
            type="number"
            min="0.01"
            step="0.01"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            required
            placeholder="مثال: 150"
          />

          <Input
            label="تاريخ الاستلام"
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            required
          />

          <Select
            label="طريقة القبض"
            options={['Cash', 'Bank Transfer', 'Card']}
            value={payMethod}
            onChange={(val) => setPayMethod(val)}
            customValue={customPayMethod}
            onCustomChange={setCustomPayMethod}
            required
          />

          <Select
            label="الموظف المستلم للمبلغ"
            options={employeeNames}
            value={payEmpId}
            onChange={(val) => setPayEmpId(val)}
            customValue={customPayEmp}
            onCustomChange={setCustomPayEmp}
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">ملاحظات الدفعة</label>
            <textarea
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              rows={2}
              placeholder="مثال: عربون الحفل، باقي الحساب نقداً، إلخ..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {paymentFormError && <p className="text-xs text-red-500">{paymentFormError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isPaymentSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              isLoading={isPaymentSubmitting}
            >
              تسجيل القبض وحفظ
            </Button>
          </div>
        </form>
      </Modal>

      {/* Return Product Modal Popup */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setSelectedReturnItem(null);
        }}
        title={`تسجيل إرجاع منتج مؤجر`}
      >
        {selectedReturnItem && (
          <form onSubmit={handleReturnSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5">
              <div>
                <span className="font-bold text-slate-455">المنتج: </span>
                <span className="font-black">{selectedReturnItem.category}</span>
              </div>
              <div>
                <span className="font-bold text-slate-455">الكمية المؤجرة الأصلية: </span>
                <span className="font-black">{selectedReturnItem.quantity} قطع</span>
              </div>
              <div>
                <span className="font-bold text-slate-455">مبلغ تأمين القطعة: </span>
                <span className="font-black">{formatCurrency(selectedReturnItem.depositAmount)}</span>
              </div>
            </div>

            <Input
              label="الكمية المرجعة الفعلية"
              type="number"
              min="1"
              max={selectedReturnItem.quantity}
              value={retQty}
              onChange={(e) => setRetQty(e.target.value)}
              required
            />

            <Input
              label="تاريخ الإرجاع الفعلي"
              type="date"
              value={retDate}
              onChange={(e) => setRetDate(e.target.value)}
              required
            />

            <Select
              label="حالة القطعة عند الاسترجاع"
              options={['Excellent', 'Good', 'Damaged']}
              value={retCondition}
              onChange={(val) => setRetCondition(val)}
              customValue={customCondition}
              onCustomChange={setCustomCondition}
              required
            />

            <Select
              label="الموظف المستلم للمرتجع"
              options={employeeNames}
              value={retEmpId}
              onChange={(val) => setRetEmpId(val)}
              customValue={customRetEmp}
              onCustomChange={setCustomRetEmp}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">ملاحظات الإرجاع</label>
              <textarea
                value={retNotes}
                onChange={(e) => setRetNotes(e.target.value)}
                rows={2}
                placeholder="تفاصيل التلف إن وجد، استرداد التأمين للزبون..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm"
              />
            </div>

            {returnFormError && <p className="text-xs text-red-500">{returnFormError}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setIsReturnModalOpen(false);
                  setSelectedReturnItem(null);
                }}
                disabled={isReturnSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                isLoading={isReturnSubmitting}
              >
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
