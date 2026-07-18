import React, { useEffect, useState } from 'react';
import { 
  ShoppingBag, Search, Plus, Trash2, Calendar, Phone, 
  User, DollarSign, Filter, ArrowLeft, PlusCircle, Check, Eye 
} from 'lucide-react';
import { orderService, customerService } from '../services/api';
import { formatCurrency, formatDate, translateStatus, translatePaymentStatus } from '../utils/arabic';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import { supabase } from '../utils/supabaseClient';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface OrdersProps {
  onNavigate: (page: string, params?: any) => void;
  activeEmployee: { id: string; name: string } | null;
  pageParams?: any;
}

export const Orders: React.FC<OrdersProps> = ({ onNavigate, activeEmployee, pageParams }) => {
  const editOrderId = pageParams?.editId;
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [operationFilter, setOperationFilter] = useState('all');

  // Form State for Create Order
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custBackupPhone, setCustBackupPhone] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [empId, setEmpId] = useState('');
  const [customEmpName, setCustomEmpName] = useState(''); // dropdown Other support
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [discount, setDiscount] = useState('0');
  const [advancePaid, setAdvancePaid] = useState('0');

  // Global Dates managed at customer level
  const [globalDeliveryDate, setGlobalDeliveryDate] = useState('');
  const [globalReturnDate, setGlobalReturnDate] = useState('');
  const [globalGraduationDate, setGlobalGraduationDate] = useState('');
  
  // Order items array
  const [items, setItems] = useState<any[]>([]);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isWalkIn, setIsWalkIn] = useState(false);

  const handleWalkInChange = (checked: boolean) => {
    setIsWalkIn(checked);
    if (checked) {
      setCustName('/');
      setCustPhone('/');
      setCustBackupPhone('');
      setCustNotes('/');
    } else {
      setCustName('');
      setCustPhone('');
      setCustBackupPhone('');
      setCustNotes('');
    }
  };

  const handleGlobalDeliveryDateChange = (val: string) => {
    setGlobalDeliveryDate(val);
    const autoReturn = calculateAutoReturnDate(val);
    setGlobalReturnDate(autoReturn);
  };

  const calculateAutoReturnDate = (deliveryDateStr: string): string => {
    if (!deliveryDateStr) return '';
    const date = new Date(deliveryDateStr);
    if (isNaN(date.getTime())) return '';
    
    // Add 1 day
    date.setDate(date.getDate() + 1);
    
    // 5 = Friday. If next day is Friday, add one more day to return on Saturday.
    if (date.getDay() === 5) {
      date.setDate(date.getDate() + 1);
    }
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Load order data if in edit mode
  useEffect(() => {
    const loadOrderToEdit = async () => {
      if (!editOrderId) return;
      try {
        setIsLoading(true);
        const orderToEdit = await orderService.getById(editOrderId);
        if (orderToEdit) {
          setIsCreating(true);
          setCustName(orderToEdit.customerName);
          setCustPhone(orderToEdit.customerPhone);
          setCustBackupPhone(orderToEdit.customer?.backupPhone || '');
          setCustNotes(orderToEdit.customer?.notes || '');
          setEmpId(orderToEdit.employeeId);
          setOrderDate(orderToEdit.orderDate.split('T')[0]);
          setGeneralNotes(orderToEdit.notes || '');
          setDiscount(String(orderToEdit.discount));
          setAdvancePaid(String(orderToEdit.totalPaid || 0));
          setIsWalkIn(orderToEdit.customerName === '/' && orderToEdit.customerPhone === '/');
          
          // Extract global dates from the first item
          const firstItem = orderToEdit.items[0];
          setGlobalDeliveryDate(firstItem?.deliveryDate?.split('T')[0] || '');
          setGlobalReturnDate(firstItem?.returnDate?.split('T')[0] || '');
          setGlobalGraduationDate(firstItem?.graduationDate?.split('T')[0] || '');

          setItems(
            orderToEdit.items.map((item: any) => ({
              id: item.id,
              category: item.category,
              customCategory: item.customCategory || '',
              capType: item.capType || '',
              customCapType: item.customCapType || '',
              capSize: item.capSize || '',
              customCapSize: item.customCapSize || '',
              capColor: item.capColor || '',
              customCapColor: item.customCapColor || '',
              operationType: item.operationType || 'Sale',
              customOperation: item.customOperation || '',
              saleType: item.saleType || '',
              customSaleType: item.customSaleType || '',
              broochType: item.broochType || '',
              customBroochType: item.customBroochType || '',
              accessoryName: item.accessoryName || '',
              customAccessoryName: item.customAccessoryName || '',
              quantity: String(item.quantity),
              unitPrice: String(item.unitPrice || ''),
              depositAmount: String(item.depositAmount || ''),
              deliveryDate: item.deliveryDate || '',
              returnDate: item.returnDate || '',
              graduationDate: item.graduationDate || '',
              notes: item.notes || ''
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load order for editing:', err);
        setError('فشل تحميل الفاتورة للتعديل.');
      } finally {
        setIsLoading(false);
      }
    };
    loadOrderToEdit();
  }, [editOrderId]);

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

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const data = await orderService.getAll({
        search: search || undefined,
        employeeId: employeeFilter,
        status: statusFilter,
        paymentStatus: paymentFilter,
        deliveryStatus: deliveryFilter,
        dateRange: dateRangeFilter,
        operationType: operationFilter
      });
      setOrders(data);
    } catch (err: any) {
      console.error(err);
      setError('فشل تحميل قائمة الطلبات.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, employeeFilter, statusFilter, paymentFilter, deliveryFilter, dateRangeFilter, operationFilter]);

  // Set default employee when loading creation screen
  useEffect(() => {
    if (isCreating && activeEmployee) {
      setEmpId(activeEmployee.id);
    }
  }, [isCreating, activeEmployee]);

  // Calculation helpers
  const calculateTotals = () => {
    let subtotal = 0;
    items.forEach((item) => {
      const qty = parseInt(item.quantity) || 0;
      const price = parseFloat(item.unitPrice) || 0;
      subtotal += qty * price;
    });
    const disc = parseFloat(discount) || 0;
    const grandTotal = Math.max(0, subtotal - disc);
    return { subtotal, grandTotal };
  };

  const handleAddItem = () => {
    const defaultItem = {
      id: Math.random().toString(), // local id key
      category: '',
      customCategory: '',
      
      capType: '',
      customCapType: '',
      capSize: '',
      customCapSize: '',
      capColor: '',
      customCapColor: '',
      
      operationType: 'Sale', // Default is Sale
      customOperation: '',
      
      saleType: '',
      customSaleType: '',
      
      broochType: '',
      customBroochType: '',
      
      accessoryName: '',
      customAccessoryName: '',

      quantity: '1',
      unitPrice: '',
      depositAmount: '',
      deliveryDate: '',
      returnDate: '',
      graduationDate: '',
      notes: ''
    };
    setItems((prev) => [...prev, defaultItem]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemFieldChange = (id: string, field: string, value: string) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
          if (field === 'category') {
            if (value === 'Graduation Brooch' || value === 'Graduation Accessories') {
              updated.operationType = 'Sale';
            }
            updated.unitPrice = '';
            updated.depositAmount = '';
          }

          if (field === 'operationType') {
            updated.unitPrice = '';
            updated.depositAmount = '';
            if (value === 'Sale') {
              updated.returnDate = '';
            } else if (value === 'Rental' && item.deliveryDate) {
              updated.returnDate = calculateAutoReturnDate(item.deliveryDate);
            }
          }

          if (field === 'deliveryDate') {
            if (item.operationType === 'Rental') {
              updated.returnDate = calculateAutoReturnDate(value);
            }
          }

          return updated;
        }
        return item;
      })
    );
  };

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!custName || !custPhone || !empId) {
      setFormError('يرجى تعبئة الحقول الأساسية (اسم الزبون، الهاتف، الموظف المسؤول)');
      return;
    }

    if (items.length === 0) {
      setFormError('يرجى إضافة منتج واحد على الأقل للطلب');
      return;
    }

    // Verify all item custom fallbacks are filled if 'Other' is chosen
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.category) {
        setFormError(`يرجى تحديد تصنيف المنتج للسطر رقم ${i + 1}`);
        return;
      }
      if (item.category === 'Other' && !item.customCategory) {
        setFormError(`يرجى إدخال اسم التصنيف المخصص في السطر رقم ${i + 1}`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      
      if (editOrderId) {
        // 1. Find the customer for this order to update details
        const { data: orderObj } = await supabase.from('Order').select('customerId, totalPaid').eq('id', editOrderId).single();
        if (orderObj) {
          await customerService.update((orderObj as any).customerId, {
            name: custName,
            phone: custPhone,
            backupPhone: custBackupPhone,
            notes: custNotes
          });
        }

        // 2. Clear old order items
        await supabase.from('OrderItem').delete().eq('orderId', editOrderId);

        // 3. Create new order items
        for (const item of items) {
          const unitPriceVal = parseFloat(item.unitPrice) || 0;
          const depositVal = parseFloat(item.depositAmount) || 0;
          const { error: editItemErr } = await supabase.from('OrderItem').insert({
            id: generateUUID(),
            orderId: editOrderId,
            category: item.category,
            customCategory: item.customCategory || null,
            capType: item.capType || null,
            customCapType: item.customCapType || null,
            capSize: item.capSize || null,
            customCapSize: item.customCapSize || null,
            capColor: item.capColor || null,
            customCapColor: item.customCapColor || null,
            operationType: item.operationType || 'Sale',
            customOperation: item.customOperation || null,
            saleType: item.saleType || null,
            customSaleType: item.customSaleType || null,
            broochType: item.broochType || null,
            customBroochType: item.customBroochType || null,
            accessoryName: item.accessoryName || null,
            customAccessoryName: item.customAccessoryName || null,
            quantity: parseInt(item.quantity) || 1,
            unitPrice: unitPriceVal,
            depositAmount: item.operationType === 'Rental' ? depositVal : 0,
            deliveryDate: globalDeliveryDate || null,
            returnDate: globalReturnDate || null,
            graduationDate: globalGraduationDate || null,
            notes: item.notes || null,
            status: 'Waiting'
          });
          if (editItemErr) throw editItemErr;
        }

        // 4. Update order totals
        const { subtotal, grandTotal } = calculateTotals();
        const advancePaidVal = parseFloat(advancePaid) || 0;
        await orderService.update(editOrderId, {
          employeeId: empId,
          orderDate,
          subtotal,
          discount: parseFloat(discount) || 0,
          grandTotal,
          totalPaid: advancePaidVal,
          remainingBalance: Math.max(0, grandTotal - advancePaidVal),
          paymentStatus: advancePaidVal >= grandTotal ? 'FullyPaid' : (advancePaidVal > 0 ? 'DepositPaid' : 'Unpaid'),
          notes: generalNotes,
        });

        // 5. Recreate payment record for edit order
        await supabase.from('Payment').delete().eq('orderId', editOrderId);
        if (advancePaidVal > 0) {
          const { error: payErr } = await supabase.from('Payment').insert({
            id: generateUUID(),
            orderId: editOrderId,
            employeeId: empId,
            amount: advancePaidVal,
            paymentMethod: 'Cash',
            paymentDate: orderDate || new Date().toISOString().split('T')[0],
            notes: 'دفعة مالية محددة عند تعديل الفاتورة',
          });
          if (payErr) throw payErr;
        }

        // 6. Log audit
        const { data: empObj } = await supabase.from('Employee').select('name').eq('id', empId).single();
        await supabase.from('AuditLog').insert({
          id: generateUUID(),
          employeeId: empId,
          employeeName: empObj?.name || 'مجهول',
          action: 'UPDATE_ORDER',
          details: `تعديل الفاتورة رقم ${editOrderId} للزبون ${custName}`
        });

        setIsCreating(false);
        onNavigate('order-details', { id: editOrderId });
        return;
      }

      // Call creation API
      await orderService.create({
        customerName: custName,
        customerPhone: custPhone,
        customerBackupPhone: custBackupPhone,
        customerNotes: custNotes,
        employeeId: empId,
        orderDate,
        notes: generalNotes,
        discount: parseFloat(discount) || 0,
        advancePaid: parseFloat(advancePaid) || 0,
        items: items.map(item => ({
          ...item,
          name: item.accessoryName || item.category,
          type: item.operationType || 'Sale',
          quantity: parseInt(item.quantity) || 1,
          salePrice: item.operationType === 'Sale' ? (parseFloat(item.unitPrice) || 0) : null,
          rentalPrice: item.operationType === 'Rental' ? (parseFloat(item.unitPrice) || 0) : null,
          depositAmount: item.operationType === 'Rental' ? (parseFloat(item.depositAmount) || 0) : 0,
          size: item.capSize || null,
          color: item.capColor || null,
          customOptions: item.customCategory || item.customCapType || item.customCapSize || item.customCapColor || item.customSaleType || item.customBroochType || item.customAccessoryName || null,
          deliveryDate: globalDeliveryDate || null,
          expectedReturnDate: globalReturnDate || null,
          graduationDate: globalGraduationDate || null,
        }))
      });

      setIsCreating(false);
      // Reset form
      setCustName('');
      setCustPhone('');
      setCustBackupPhone('');
      setCustNotes('');
      setGeneralNotes('');
      setDiscount('0');
      setAdvancePaid('0');
      setGlobalDeliveryDate('');
      setGlobalReturnDate('');
      setGlobalGraduationDate('');
      setItems([]);
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || err.response?.data?.error || 'حدث خطأ أثناء حفظ الفاتورة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { subtotal, grandTotal } = calculateTotals();

  // Employee lookup names is loaded dynamically in employees state

  return (
    <div className="space-y-6">
      {/* Header */}
      {isCreating ? (
        <div className="flex items-center gap-3 animate-slide-down">
          <button 
            onClick={() => {
              setIsCreating(false);
              onNavigate('orders');
            }}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-655 dark:text-slate-200 rounded-xl transition-all shadow-sm flex items-center"
          >
            <ArrowLeft className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 font-cairo">
              {editOrderId ? 'تعديل وتحديث فاتورة التخرج' : 'إنشاء فاتورة / طلبية تخرج جديدة'}
            </h1>
            <p className="text-xs text-slate-450 dark:text-slate-555 font-bold font-tajawal mt-0.5">
              {editOrderId ? 'تعديل بيانات الفاتورة الحالية والقطع والمبالغ والمدفوعات' : 'أدخل بيانات الزبون ثم أضف المنتجات المطلوبة بالتفصيل مع الحساب الآلي للقيم'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-850 dark:text-slate-100 font-cairo">
              إدارة الطلبات والفواتير
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold font-tajawal mt-1">
              إدخال طلبيات بيع وإيجار كابات وقبعات التخرج وتعديل حالتها
            </p>
          </div>
          <Button 
            onClick={() => {
              setIsCreating(true);
              setFormError('');
              handleAddItem(); // Add first item slot automatically
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            طلب / فاتورة جديدة
          </Button>
        </div>
      )}

      {/* Main Views */}
      {!isCreating ? (
        // 1. Orders Listing View with filter panels
        <div className="space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Global search */}
              <div className="lg:col-span-2">
                <Input
                  label="بحث شامل"
                  placeholder="ابحث برقم الفاتورة، اسم الزبون، رقم الهاتف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-450 dark:text-slate-500 font-tajawal">حالة الطلبية</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="all">كل الحالات</option>
                  <option value="Pending">قيد الانتظار</option>
                  <option value="Preparing">جاري التجهيز</option>
                  <option value="Ready">جاهز للاستلام</option>
                  <option value="Delivered">تم التوصيل</option>
                  <option value="Completed">مكتملة</option>
                  <option value="Cancelled">ملغية</option>
                </select>
              </div>

              {/* Payment Status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-450 dark:text-slate-500 font-tajawal">حالة الدفع</label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="all">كل حالات الدفع</option>
                  <option value="Unpaid">غير مدفوع</option>
                  <option value="DepositPaid">تم دفع العربون</option>
                  <option value="PartiallyPaid">مدفوع جزئياً</option>
                  <option value="FullyPaid">مدفوع بالكامل</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-850/50">
              {/* Delivery status */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 font-tajawal">حالة التسليم للمنتج</label>
                <select
                  value={deliveryFilter}
                  onChange={(e) => setDeliveryFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="all">كل حالات التسليم</option>
                  <option value="Waiting">قيد الانتظار</option>
                  <option value="Ready">جاهز للتسليم</option>
                  <option value="Delivered">تم التسليم</option>
                  <option value="Returned">تم الإرجاع</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 font-tajawal">تاريخ الطلب</label>
                <select
                  value={dateRangeFilter}
                  onChange={(e) => setDateRangeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="all">كل التواريخ</option>
                  <option value="today">اليوم</option>
                  <option value="yesterday">أمس</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="month">هذا الشهر</option>
                  <option value="year">هذا العام</option>
                </select>
              </div>

              {/* Operation type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 font-tajawal">نوع المعاملة</label>
                <select
                  value={operationFilter}
                  onChange={(e) => setOperationFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="all">الكل (بيع وإيجار)</option>
                  <option value="Sale">بيع</option>
                  <option value="Rental">إيجار</option>
                  <option value="Return">مرجوعات</option>
                </select>
              </div>

              {/* Responsible employee */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 dark:text-slate-500 font-tajawal">الموظف المسؤول</label>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold"
                >
                  <option value="all">كل الموظفين</option>
                  <option value="f3a479b1-e221-4f19-a1b7-d15764d2d46e">أنس</option>
                  <option value="a98f5c9e-5b12-4c28-98e3-f8a183d2d2a4">طه</option>
                </select>
              </div>
            </div>
          </div>

          {/* Orders Table list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-5 rounded-2xl shadow-sm">
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
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-555">
                      <th className="py-3 px-4 font-bold font-tajawal">رقم الفاتورة</th>
                      <th className="py-3 px-4 font-bold font-tajawal">اسم الزبون</th>
                      <th className="py-3 px-4 font-bold font-tajawal">رقم الهاتف</th>
                      <th className="py-3 px-4 font-bold font-tajawal">التاريخ</th>
                      <th className="py-3 px-4 font-bold font-tajawal">المسؤول</th>
                      <th className="py-3 px-4 font-bold font-tajawal">قيمة الفاتورة</th>
                      <th className="py-3 px-4 font-bold font-tajawal">المدفوع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">المتبقي</th>
                      <th className="py-3 px-4 font-bold font-tajawal">حالة الدفع</th>
                      <th className="py-3 px-4 font-bold font-tajawal">حالة الطلب</th>
                      <th className="py-3 px-4 font-bold font-tajawal">تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-850">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                        <td className="py-3.5 px-4 font-black text-brand-600 dark:text-brand-400 font-tajawal">{o.orderNumber}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">{o.customer?.name}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500 dark:text-slate-455 font-tajawal">{o.customer?.phone}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-500 font-tajawal">{formatDate(o.orderDate)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-655 dark:text-slate-350">{o.employee?.name}</td>
                        <td className="py-3.5 px-4 font-black text-slate-850 dark:text-slate-100 font-cairo">{formatCurrency(o.grandTotal)}</td>
                        <td className="py-3.5 px-4 font-black text-emerald-650 font-cairo">{formatCurrency(o.totalPaid)}</td>
                        <td className="py-3.5 px-4 font-black text-red-650 font-cairo">{formatCurrency(o.remainingBalance)}</td>
                        <td className="py-3.5 px-4 font-semibold">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            o.paymentStatus === 'FullyPaid' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                            o.paymentStatus === 'PartiallyPaid' ? 'bg-blue-50 text-blue-650' :
                            o.paymentStatus === 'DepositPaid' ? 'bg-amber-50 text-amber-600' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {translatePaymentStatus(o.paymentStatus)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            o.status === 'Completed' || o.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                            o.status === 'Cancelled' ? 'bg-red-50 text-red-600' :
                            o.status === 'Ready' ? 'bg-blue-50 text-blue-650' :
                            'bg-orange-50 text-orange-650'
                          }`}>
                            {translateStatus(o.status)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <button 
                            onClick={() => onNavigate('order-details', { id: o.id })}
                            className="p-1 text-brand-600 hover:text-brand-700 dark:hover:text-brand-400 bg-brand-50 dark:bg-brand-950/20 rounded-lg transition-all"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-10 text-center text-slate-400 dark:text-slate-600 font-tajawal">
                          لا يوجد فواتير مطابقة لخيارات الفلترة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // 2. Create Order Form View
        <form onSubmit={handleSaveOrder} className="space-y-6 animate-slide-up">
          
          {/* Customer info card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                المعلومات الأساسية وبيانات الزبون
              </h3>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-955/40 px-3 py-1.5 rounded-xl border border-slate-150 dark:border-slate-800 w-fit">
                <input
                  type="checkbox"
                  id="walkInCustomer"
                  checked={isWalkIn}
                  onChange={(e) => handleWalkInChange(e.target.checked)}
                  className="w-4 h-4 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded focus:ring-brand-500 cursor-pointer"
                />
                <label 
                  htmlFor="walkInCustomer" 
                  className="text-xs font-bold text-slate-750 dark:text-slate-200 cursor-pointer select-none font-tajawal"
                >
                  لا يوجد
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="اسم الزبون بالكامل"
                value={custName}
                onChange={(e) => setCustName(e.target.value)}
                required
                placeholder="صالح مسعود..."
                disabled={isWalkIn}
              />
              <Input
                label="رقم هاتف الزبون"
                value={custPhone}
                onChange={(e) => setCustPhone(e.target.value)}
                required
                placeholder="0912345678"
                disabled={isWalkIn}
              />
              <Input
                label="رقم الهاتف الاحتياطي (اختياري)"
                value={custBackupPhone}
                onChange={(e) => setCustBackupPhone(e.target.value)}
                placeholder="0921234567"
                disabled={isWalkIn}
              />
              
              <Select
                label="الموظف المسؤول"
                options={employees}
                value={empId}
                onChange={(val) => setEmpId(val)}
                customValue={customEmpName}
                onCustomChange={setCustomEmpName}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/60">
              <Input
                label="تاريخ الطلب"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
              <Input
                label="تاريخ التخرج"
                type="date"
                value={globalGraduationDate}
                onChange={(e) => setGlobalGraduationDate(e.target.value)}
                required
              />
              <Input
                label="تاريخ تسليم الطلب (موعد الاستلام)"
                type="date"
                value={globalDeliveryDate}
                onChange={(e) => handleGlobalDeliveryDateChange(e.target.value)}
                required
              />
              {items.some((item) => item.operationType === 'Rental') && (
                <Input
                  label="تاريخ الإرجاع (اليوم التالي)"
                  type="date"
                  value={globalReturnDate}
                  onChange={(e) => setGlobalReturnDate(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">ملاحظات عامة عن الفاتورة</label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات التسليم، الحفل، تغليف خاص..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition-all shadow-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200">ملاحظات الزبون (تحفظ في حسابه)</label>
                <textarea
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات تحفظ بملف الزبون الدائم لمراجعتها لاحقاً..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-955 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition-all shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Products List Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                المنتجات والقطع المطلوبة في الفاتورة
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 dark:hover:text-brand-400 flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 dark:bg-brand-950/20 rounded-xl transition-all border border-brand-100/30"
              >
                <PlusCircle className="w-4 h-4" />
                إضافة منتج جديد للطلب (+ Add Product)
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="p-5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-850 rounded-2xl space-y-4 relative"
                >
                  {/* Delete Item button */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-red-650 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Header Item Count */}
                  <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 bg-slate-200/50 dark:bg-slate-800/60 px-2 py-0.5 rounded">
                    المنتج رقم ({idx + 1})
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Category Selection */}
                    <Select
                      label="تصنيف المنتج"
                      options={[
                        { value: 'Graduation Cap', label: 'كاب تخرج' },
                        { value: 'Graduation Hat', label: 'قبعة تخرج' },
                        { value: 'Graduation Sash', label: 'شال تخرج' },
                        { value: 'Graduation Brooch', label: 'بروش تخرج' },
                        { value: 'Graduation Accessories', label: 'إكسسوارات تخرج' }
                      ]}
                      value={item.category}
                      onChange={(val) => handleItemFieldChange(item.id, 'category', val)}
                      customValue={item.customCategory}
                      onCustomChange={(val) => handleItemFieldChange(item.id, 'customCategory', val)}
                      required
                    />

                    {/* DYNAMIC Nested Fields based on Category */}
                    {/* 1. Graduation Cap sub-options */}
                    {item.category === 'Graduation Cap' && (
                      <>
                        <Select
                          label="نوع الكاب"
                          options={[
                            { value: 'Long / Butterfly Cap', label: 'كاب فراشة طويل' },
                            { value: 'TLC Cap', label: 'كاب TLC' },
                            { value: 'American Cap', label: 'كاب أمريكي' },
                            { value: 'Kuwaiti Cap', label: 'كاب كويتي' }
                          ]}
                          value={item.capType}
                          onChange={(val) => handleItemFieldChange(item.id, 'capType', val)}
                          customValue={item.customCapType}
                          onCustomChange={(val) => handleItemFieldChange(item.id, 'customCapType', val)}
                          required
                        />

                        {item.capType === 'TLC Cap' && (
                          <Select
                            label="قياس كاب TLC"
                            options={[
                              { value: 'S', label: 'صغير (S)' },
                              { value: '1', label: 'قياس 1' },
                              { value: '2', label: 'قياس 2' },
                              { value: '3', label: 'قياس 3' }
                            ]}
                            value={item.capSize}
                            onChange={(val) => handleItemFieldChange(item.id, 'capSize', val)}
                            customValue={item.customCapSize}
                            onCustomChange={(val) => handleItemFieldChange(item.id, 'customCapSize', val)}
                            required
                          />
                        )}

                        {item.capType === 'Kuwaiti Cap' && (
                          <Select
                            label="لون كاب كويتي"
                            options={[
                              { value: 'Silver', label: 'فضي' },
                              { value: 'Gold', label: 'ذهبي' },
                              { value: 'Plain', label: 'سادة' }
                            ]}
                            value={item.capColor}
                            onChange={(val) => handleItemFieldChange(item.id, 'capColor', val)}
                            customValue={item.customCapColor}
                            onCustomChange={(val) => handleItemFieldChange(item.id, 'customCapColor', val)}
                            required
                          />
                        )}
                      </>
                    )}

                    {/* 2. Graduation Cap / Hat / Sash (Sale vs Rental) */}
                    {(item.category === 'Graduation Cap' || item.category === 'Graduation Hat' || item.category === 'Graduation Sash') && (
                      <>
                        <Select
                          label="نوع المعاملة"
                          options={[
                            { value: 'Sale', label: 'بيع' },
                            { value: 'Rental', label: 'إيجار' }
                          ]}
                          value={item.operationType}
                          onChange={(val) => handleItemFieldChange(item.id, 'operationType', val)}
                          customValue={item.customOperation}
                          onCustomChange={(val) => handleItemFieldChange(item.id, 'customOperation', val)}
                          required
                        />

                        {item.operationType === 'Sale' && (
                          <Select
                            label="نوع البيع"
                            options={[
                              { value: 'Plain', label: 'سادة' },
                              { value: 'Embroidery', label: 'تطريز' },
                              { value: 'Printing', label: 'طباعة' }
                            ]}
                            value={item.saleType}
                            onChange={(val) => handleItemFieldChange(item.id, 'saleType', val)}
                            customValue={item.customSaleType}
                            onCustomChange={(val) => handleItemFieldChange(item.id, 'customSaleType', val)}
                            required
                          />
                        )}
                      </>
                    )}

                    {/* 3. Brooch options */}
                    {item.category === 'Graduation Brooch' && (
                      <Select
                        label="نوع البروش"
                        options={[
                          { value: 'Graduation Year Brooch', label: 'بروش سنة التخرج' },
                          { value: 'Name Brooch', label: 'بروش بالاسم' }
                        ]}
                        value={item.broochType}
                        onChange={(val) => handleItemFieldChange(item.id, 'broochType', val)}
                        customValue={item.customBroochType}
                        onCustomChange={(val) => handleItemFieldChange(item.id, 'customBroochType', val)}
                        required
                      />
                    )}

                    {/* 4. Accessories input */}
                    {item.category === 'Graduation Accessories' && (
                      <Input
                        label="اسم الإكسسوار"
                        value={item.accessoryName}
                        onChange={(e) => handleItemFieldChange(item.id, 'accessoryName', e.target.value)}
                        placeholder="مثال: شارة التخرج، مسبحة التخرج..."
                        required
                      />
                    )}

                    {/* Shared Fields: Quantity */}
                    <Input
                      label="الكمية"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemFieldChange(item.id, 'quantity', e.target.value)}
                      required
                    />

                    {/* Price field (label changes based on Operation type) */}
                    <Input
                      label={item.operationType === 'Rental' ? 'سعر الإيجار للقطعة' : 'سعر البيع للقطعة'}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleItemFieldChange(item.id, 'unitPrice', e.target.value)}
                      required
                    />

                    {/* Rental Details: Deposit */}
                    {item.operationType === 'Rental' && (
                      <Input
                        label="مبلغ تأمين القطعة"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.depositAmount}
                        onChange={(e) => handleItemFieldChange(item.id, 'depositAmount', e.target.value)}
                        required
                      />
                    )}
                  </div>

                  {/* Notes line */}
                  <Input
                    label="تفاصيل المنتج أو ملاحظات للخط"
                    value={item.notes}
                    onChange={(e) => handleItemFieldChange(item.id, 'notes', e.target.value)}
                    placeholder="مثال: الاسم للتطريز: 'محمد'، مقاس الرأس للقبعة، إلخ..."
                  />

                </div>
              ))}
            </div>
          </div>

          {/* Pricing Ledger summary card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800/60 pb-2">
              الحسابات المالية والتخفيض
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              <div>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 block font-tajawal">المجموع الفرعي (قبل الخصم)</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100 font-cairo">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              <Input
                label="قيمة الخصم (د.ل)"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />

              <div className="p-3 bg-brand-50 dark:bg-brand-950/30 rounded-xl flex items-center justify-between border border-brand-100/50">
                <span className="text-xs font-black text-brand-700 dark:text-brand-400 font-tajawal">المجموع النهائي المستحق</span>
                <h3 className="text-lg font-black text-brand-800 dark:text-brand-350 font-cairo">
                  {formatCurrency(grandTotal)}
                </h3>
              </div>
            </div>

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsCreating(false)}
                disabled={isSubmitting}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                icon={<Check className="w-4 h-4" />}
              >
                حفظ الفاتورة وتأكيد الطلب
              </Button>
            </div>
          </div>

        </form>
      )}

    </div>
  );
};

export default Orders;
