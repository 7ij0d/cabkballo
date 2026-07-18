import { supabase } from '../utils/supabaseClient';
import bcrypt from 'bcryptjs';

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

// Helper to audit actions directly from the client side
const createAuditLog = async (employeeId: string, action: string, details: string) => {
  try {
    const { data: emp } = await supabase.from('Employee').select('name').eq('id', employeeId).single();
    await supabase.from('AuditLog').insert({
      id: generateUUID(),
      employeeId,
      employeeName: emp?.name || 'مجهول',
      action,
      details,
    });
  } catch (err) {
    console.error('فشل تسجيل الحركة في السجل:', err);
  }
};

export const authService = {
  login: async (credentials: { username: string; password: any }) => {
    console.log('محاولة تسجيل الدخول:', credentials.username);
    // 1. Fetch employee
    const { data: employee, error } = await supabase
      .from('Employee')
      .select('*')
      .eq('username', credentials.username.toLowerCase().trim())
      .single();

    console.log('بيانات الموظف المسترجعة من سوبابيز:', { employee, error });

    if (error || !employee) {
      console.warn('لم يتم العثور على الموظف أو حدث خطأ في قاعدة البيانات');
      throw { response: { data: { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' } } };
    }

    // 2. Match password hash
    console.log('مقارنة كلمة المرور مع الهاش المسترجع...');
    const isPasswordValid = await bcrypt.compare(credentials.password, employee.passwordHash);
    console.log('نتيجة التحقق من كلمة المرور:', isPasswordValid);
    if (!isPasswordValid) {
      throw { response: { data: { error: 'اسم المستخدم أو كلمة المرور غير صحيحة' } } };
    }

    // 3. Log login action
    await createAuditLog(employee.id, 'LOGIN', `تسجيل دخول ناجح للموظف ${employee.name}`);

    // Return session structure
    const sessionData = {
      token: 'client-supabase-session-token',
      employee: {
        id: employee.id,
        username: employee.username,
        name: employee.name,
      },
    };
    
    // Save to localStorage immediately
    localStorage.setItem('token', sessionData.token);
    localStorage.setItem('employee', JSON.stringify(sessionData.employee));
    
    return sessionData;
  },
};

export const customerService = {
  getAll: async (search?: string) => {
    // 1. Fetch all customers
    let query = supabase.from('Customer').select('*');
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,backupPhone.ilike.%${search}%`);
    }
    const { data: customers } = await query;
    if (!customers) return [];

    // 2. Fetch all orders and payments to calculate aggregates
    const { data: orders } = await supabase.from('Order').select('id, customerId, grandTotal, remainingBalance, orderDate');
    const { data: payments } = await supabase.from('Payment').select('amount, orderId');

    return customers.map((c) => {
      const cOrders = orders?.filter((o) => o.customerId === c.id) || [];
      const orderIds = cOrders.map((o) => o.id);
      const cPayments = payments?.filter((p) => orderIds.includes(p.orderId)) || [];

      const totalPaid = cPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = cOrders.reduce((sum, o) => sum + o.remainingBalance, 0);
      
      const lastOrder = cOrders.length > 0
        ? cOrders.reduce((latest, o) => new Date(o.orderDate) > new Date(latest.orderDate) ? o : latest)
        : null;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        backupPhone: c.backupPhone,
        notes: c.notes,
        createdAt: c.createdAt,
        orderCount: cOrders.length,
        totalPaid,
        remainingBalance,
        lastOrderDate: lastOrder ? lastOrder.orderDate : null,
      };
    });
  },

  getById: async (id: string) => {
    // 1. Fetch customer
    const { data: customer } = await supabase.from('Customer').select('*').eq('id', id).single();
    if (!customer) throw new Error('الزبون غير موجود');

    // 2. Fetch their orders
    const { data: orders } = await supabase
      .from('Order')
      .select('*, Employee!OrderEmployee(name)')
      .eq('customerId', id)
      .order('createdAt', { ascending: false });

    // 3. Fetch all items for these orders
    const orderIds = orders?.map((o) => o.id) || [];
    const { data: items } = orderIds.length > 0
      ? await supabase.from('OrderItem').select('*').in('orderId', orderIds)
      : { data: [] };

    // 4. Fetch all payments for these orders
    const { data: payments } = orderIds.length > 0
      ? await supabase.from('Payment').select('*, Employee!PaymentEmployee(name)').in('orderId', orderIds)
      : { data: [] };

    const formattedOrders = orders?.map((o) => {
      const oItems = items?.filter((i) => i.orderId === o.id) || [];
      return {
        ...o,
        employeeName: (o as any).Employee?.name || 'مجهول',
        items: oItems,
      };
    }) || [];

    const rentals = items?.filter((i) => i.type === 'Rental') || [];

    const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const remainingBalance = orders?.reduce((sum, o) => sum + o.remainingBalance, 0) || 0;
    const lastOrder = orders && orders.length > 0 ? orders[0] : null;

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      backupPhone: customer.backupPhone,
      notes: customer.notes,
      createdAt: customer.createdAt,
      orderCount: orders?.length || 0,
      totalPaid,
      remainingBalance,
      lastOrderDate: lastOrder ? lastOrder.orderDate : null,
      orders: formattedOrders,
      payments: payments || [],
      rentals: rentals,
    };
  },

  create: async (data: { name: string; phone: string; backupPhone?: string; notes?: string }) => {
    const { data: newCust, error } = await supabase
      .from('Customer')
      .insert({
        name: data.name,
        phone: data.phone,
        backupPhone: data.backupPhone || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    return newCust;
  },

  update: async (id: string, data: { name: string; phone: string; backupPhone?: string; notes?: string }) => {
    const { data: updatedCust, error } = await supabase
      .from('Customer')
      .update({
        name: data.name,
        phone: data.phone,
        backupPhone: data.backupPhone || null,
        notes: data.notes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updatedCust;
  },

  delete: async (id: string) => {
    const { data: customerOrders } = await supabase.from('Order').select('id').eq('customerId', id);
    if (customerOrders && customerOrders.length > 0) {
      const orderIds = customerOrders.map((o) => o.id);
      await supabase.from('OrderItem').delete().in('orderId', orderIds);
      await supabase.from('Payment').delete().in('orderId', orderIds);
      await supabase.from('Order').delete().eq('customerId', id);
    }
    const { data: deletedCust, error } = await supabase
      .from('Customer')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return deletedCust;
  },
};

export const orderService = {
  getAll: async (filters?: {
    search?: string;
    employeeId?: string;
    status?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    dateRange?: string;
    operationType?: string;
  }) => {
    // 1. Query orders join Customer and Employee
    const { data: orders } = await supabase
      .from('Order')
      .select('*, Customer!OrderCustomer(name, phone), Employee!OrderEmployee(name)')
      .order('createdAt', { ascending: false });

    if (!orders) return [];

    // 2. Fetch order items for filtering
    const { data: items } = await supabase.from('OrderItem').select('*');

    // 3. Apply client side filtering
    let filtered = orders.map((o) => {
      const oItems = items?.filter((i) => i.orderId === o.id) || [];
      return {
        ...o,
        customerName: (o as any).Customer?.name || 'مجهول',
        customerPhone: (o as any).Customer?.phone || 'مجهول',
        employeeName: (o as any).Employee?.name || 'مجهول',
        items: oItems,
      };
    });

    if (filters) {
      if (filters.search) {
        const term = filters.search.toLowerCase();
        filtered = filtered.filter((o) =>
          o.customerName.toLowerCase().includes(term) ||
          o.customerPhone.includes(term) ||
          o.invoiceNumber.includes(term)
        );
      }
      if (filters.employeeId) {
        filtered = filtered.filter((o) => o.employeeId === filters.employeeId);
      }
      if (filters.status) {
        filtered = filtered.filter((o) => o.status === filters.status);
      }
      if (filters.paymentStatus) {
        filtered = filtered.filter((o) => o.paymentStatus === filters.paymentStatus);
      }
      if (filters.deliveryStatus) {
        filtered = filtered.filter((o) => o.deliveryStatus === filters.deliveryStatus);
      }
      if (filters.operationType) {
        filtered = filtered.filter((o) =>
          o.items.some((i: any) => i.type === filters.operationType)
        );
      }
      if (filters.dateRange) {
        const now = new Date();
        const start = new Date();
        if (filters.dateRange === 'today') {
          start.setHours(0, 0, 0, 0);
        } else if (filters.dateRange === 'week') {
          start.setDate(now.getDate() - 7);
        } else if (filters.dateRange === 'month') {
          start.setMonth(now.getMonth() - 1);
        }
        filtered = filtered.filter((o) => new Date(o.orderDate) >= start);
      }
    }

    return filtered;
  },

  getById: async (id: string) => {
    // 1. Fetch order
    const { data: order } = await supabase
      .from('Order')
      .select('*, Customer!OrderCustomer(*), Employee!OrderEmployee(name)')
      .eq('id', id)
      .single();

    if (!order) throw new Error('الطلب غير موجود');

    // 2. Fetch items
    const { data: items } = await supabase
      .from('OrderItem')
      .select('*, ReturnLog!ReturnOrderItem(*)')
      .eq('orderId', id);

    // 3. Fetch payments
    const { data: payments } = await supabase
      .from('Payment')
      .select('*, Employee!PaymentEmployee(name)')
      .eq('orderId', id);

    const formattedItems = items?.map((item) => {
      const returnLogs = (item as any).ReturnLog || [];
      const quantityReturned = returnLogs.reduce((sum: number, r: any) => sum + r.quantityReturned, 0);
      return {
        ...item,
        quantityReturned,
        returns: returnLogs,
      };
    }) || [];

    return {
      ...order,
      customerName: (order as any).Customer?.name || 'مجهول',
      customerPhone: (order as any).Customer?.phone || 'مجهول',
      customer: (order as any).Customer,
      employeeName: (order as any).Employee?.name || 'مجهول',
      items: formattedItems,
      payments: payments?.map((p) => ({
        ...p,
        employeeName: (p as any).Employee?.name || 'مجهول',
      })) || [],
    };
  },

  create: async (data: {
    customerName: string;
    customerPhone: string;
    customerBackupPhone?: string;
    customerNotes?: string;
    employeeId: string;
    orderDate?: string;
    notes?: string;
    discount?: number;
    advancePaid?: number;
    items: any[];
  }) => {
    // 1. Find or create customer
    let { data: customer } = await supabase
      .from('Customer')
      .select('*')
      .eq('phone', data.customerPhone)
      .maybeSingle();

    if (!customer && data.customerName !== '/') {
      const { data: nameCust } = await supabase
        .from('Customer')
        .select('*')
        .eq('name', data.customerName)
        .maybeSingle();
      if (nameCust) {
        customer = nameCust;
      }
    }

    if (!customer) {
      const { data: newCust, error } = await supabase
        .from('Customer')
        .insert({
          id: generateUUID(),
          name: data.customerName,
          phone: data.customerPhone,
          backupPhone: data.customerBackupPhone || null,
          notes: data.customerNotes || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      customer = newCust;
    }

    // 2. Calculate prices
    const discount = data.discount || 0;
    const subtotal = data.items.reduce((sum, item) => {
      const price = item.type === 'Rental' ? item.rentalPrice : item.salePrice;
      return sum + (price * item.quantity);
    }, 0);
    const grandTotal = Math.max(0, subtotal - discount);

    // 3. Get invoice number suffix
    const { count } = await supabase.from('Order').select('id', { count: 'exact', head: true });
    const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;

    // 4. Create Order
    const advancePaid = data.advancePaid || 0;
    const { data: order, error: orderErr } = await supabase
      .from('Order')
      .insert({
        id: generateUUID(),
        orderNumber: invoiceNumber,
        customerId: customer.id,
        employeeId: data.employeeId,
        orderDate: data.orderDate || new Date().toISOString().split('T')[0],
        subtotal,
        discount,
        grandTotal,
        totalPaid: advancePaid,
        remainingBalance: Math.max(0, grandTotal - advancePaid),
        status: 'Pending',
        paymentStatus: advancePaid >= grandTotal ? 'FullyPaid' : (advancePaid > 0 ? 'DepositPaid' : 'Unpaid'),
        notes: data.notes || null,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create payment record if deposit is registered
    if (advancePaid > 0) {
      const { error: payErr } = await supabase.from('Payment').insert({
        id: generateUUID(),
        orderId: order.id,
        employeeId: data.employeeId,
        amount: advancePaid,
        paymentMethod: 'Cash',
        paymentDate: data.orderDate || new Date().toISOString().split('T')[0],
        notes: 'دفعة عربون مقدم عند إنشاء الفاتورة',
      });
      if (payErr) throw payErr;
    }

    // 5. Create Order Items
    for (const item of data.items) {
      const { error: itemErr } = await supabase.from('OrderItem').insert({
        id: generateUUID(),
        orderId: order.id,
        category: item.category,
        customCategory: item.customCategory || null,
        capType: item.capType || null,
        customCapType: item.customCapType || null,
        capSize: item.capSize || null,
        customCapSize: item.customCapSize || null,
        capColor: item.capColor || null,
        customCapColor: item.customCapColor || null,
        operationType: item.type || 'Sale',
        customOperation: item.customOperation || null,
        saleType: item.saleType || null,
        customSaleType: item.customSaleType || null,
        broochType: item.broochType || null,
        customBroochType: item.customBroochType || null,
        accessoryName: item.accessoryName || null,
        customAccessoryName: item.customAccessoryName || null,
        quantity: parseInt(item.quantity) || 1,
        unitPrice: item.type === 'Rental' ? (parseFloat(item.rentalPrice) || 0) : (parseFloat(item.salePrice) || 0),
        depositAmount: item.type === 'Rental' ? (parseFloat(item.depositAmount) || 0) : 0,
        deliveryDate: item.deliveryDate || null,
        returnDate: item.expectedReturnDate || null,
        graduationDate: item.graduationDate || null,
        notes: item.notes || null,
        status: 'Waiting'
      });
      if (itemErr) throw itemErr;
    }

    // 6. Audit action
    await createAuditLog(data.employeeId, 'CREATE_ORDER', `إنشاء فاتورة جديدة برقم ${invoiceNumber} للزبون ${customer.name}`);

    return order;
  },

  update: async (id: string, data: any) => {
    const { data: updatedOrder, error } = await supabase
      .from('Order')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updatedOrder;
  },

  delete: async (id: string) => {
    // Delete related items first
    await supabase.from('OrderItem').delete().eq('orderId', id);
    await supabase.from('Payment').delete().eq('orderId', id);
    
    const { data: deletedOrder, error } = await supabase
      .from('Order')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return deletedOrder;
  },

  updateItemStatus: async (itemId: string, status: string) => {
    const { data: updatedItem, error } = await supabase
      .from('OrderItem')
      .update({ status })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return updatedItem;
  },
};

export const paymentService = {
  create: async (data: {
    orderId: string;
    amount: number;
    paymentDate?: string;
    paymentMethod: string;
    customMethodText?: string;
    notes?: string;
    employeeId: string;
  }) => {
    // 1. Insert payment record
    const { data: newPayment, error: payErr } = await supabase
      .from('Payment')
      .insert({
        orderId: data.orderId,
        employeeId: data.employeeId,
        amount: data.amount,
        paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
        paymentMethod: data.paymentMethod,
        customMethodText: data.customMethodText || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (payErr) throw payErr;

    // 2. Fetch the Order to update totals
    const { data: order } = await supabase.from('Order').select('*').eq('id', data.orderId).single();
    if (order) {
      const totalPaid = order.totalPaid + data.amount;
      const remainingBalance = Math.max(0, order.grandTotal - totalPaid);
      
      let paymentStatus = 'Unpaid';
      if (totalPaid >= order.grandTotal) {
        paymentStatus = 'FullyPaid';
      } else if (totalPaid > 0) {
        // If it is the only payment, call it DepositPaid. Otherwise PartiallyPaid.
        const { count } = await supabase.from('Payment').select('id', { count: 'exact', head: true }).eq('orderId', data.orderId);
        paymentStatus = (count || 0) <= 1 ? 'DepositPaid' : 'PartiallyPaid';
      }

      await supabase
        .from('Order')
        .update({
          totalPaid,
          remainingBalance,
          paymentStatus,
        })
        .eq('id', data.orderId);

      // Audit action
      await createAuditLog(data.employeeId, 'ADD_PAYMENT', `إضافة دفعة مالية بقيمة ${data.amount} د.ل للفاتورة ${order.invoiceNumber}`);
    }

    return newPayment;
  },

  getByOrder: async (orderId: string) => {
    const { data: payments } = await supabase
      .from('Payment')
      .select('*, Employee!PaymentEmployee(name)')
      .eq('orderId', orderId);
    
    return payments?.map((p) => ({
      ...p,
      employeeName: (p as any).Employee?.name || 'مجهول',
    })) || [];
  },
};

export const returnService = {
  getAll: async () => {
    const { data: returns } = await supabase
      .from('ReturnLog')
      .select('*, OrderItem!ReturnOrderItem(*, Order!OrderItemOrder(invoiceNumber, Customer!OrderCustomer(name))), Employee!ReturnEmployee(name)')
      .order('createdAt', { ascending: false });

    return returns?.map((r) => {
      const item = (r as any).OrderItem || {};
      const order = item.Order || {};
      const customer = order.Customer || {};
      
      return {
        ...r,
        employeeName: (r as any).Employee?.name || 'مجهول',
        productName: item.name || 'منتج مجهول',
        category: item.category || 'تصنيف مجهول',
        invoiceNumber: order.invoiceNumber || 'مجهول',
        customerName: customer.name || 'مجهول',
      };
    }) || [];
  },

  create: async (data: {
    orderItemId: string;
    quantityReturned: number;
    returnDate?: string;
    condition: string;
    customCondition?: string;
    notes?: string;
    employeeId: string;
  }) => {
    // 1. Create Return Log
    const { data: newReturn, error } = await supabase
      .from('ReturnLog')
      .insert({
        orderItemId: data.orderItemId,
        employeeId: data.employeeId,
        quantityReturned: data.quantityReturned,
        returnDate: data.returnDate || new Date().toISOString().split('T')[0],
        condition: data.condition,
        customCondition: data.customCondition || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Fetch OrderItem and check if returned quantity is complete
    const { data: item } = await supabase.from('OrderItem').select('*, Order!OrderItemOrder(id, invoiceNumber)').eq('id', data.orderItemId).single();
    if (item) {
      const { data: returnLogs } = await supabase.from('ReturnLog').select('quantityReturned').eq('orderItemId', data.orderItemId);
      const totalQtyReturned = (returnLogs || []).reduce((sum, r) => sum + r.quantityReturned, 0);

      if (totalQtyReturned >= item.quantity) {
        await supabase.from('OrderItem').update({ status: 'Returned' }).eq('id', data.orderItemId);
      }

      // Check if all rentals in this order are returned
      const orderId = (item as any).Order?.id;
      const { data: allItems } = await supabase.from('OrderItem').select('status, type').eq('orderId', orderId);
      
      const hasPendingRentals = allItems?.some((i) => i.type === 'Rental' && i.status !== 'Returned') || false;
      if (!hasPendingRentals) {
        await supabase.from('Order').update({ deliveryStatus: 'Returned', status: 'Completed' }).eq('id', orderId);
      } else {
        await supabase.from('Order').update({ deliveryStatus: 'PartiallyReturned' }).eq('id', orderId);
      }

      // Audit action
      await createAuditLog(data.employeeId, 'RETURN_PRODUCT', `إرجاع عدد ${data.quantityReturned} قطع من المنتج ${item.name} للفاتورة ${(item as any).Order?.invoiceNumber}`);
    }

    return newReturn;
  },
};

export const reportService = {
  getDashboard: async () => {
    // 1. Fetch statistics
    const { data: orders } = await supabase.from('Order').select('*, Customer!OrderCustomer(name, phone)');
    const { data: payments } = await supabase.from('Payment').select('amount');
    const { data: customers } = await supabase.from('Customer').select('id');
    const { data: items } = await supabase.from('OrderItem').select('*');
    const { data: returns } = await supabase.from('ReturnLog').select('quantityReturned');

    const totalOrders = orders?.length || 0;
    const totalCustomers = customers?.length || 0;
    const totalSales = items?.filter((i) => i.type === 'Sale').reduce((sum, i) => sum + i.quantity, 0) || 0;
    const totalRentals = items?.filter((i) => i.type === 'Rental').reduce((sum, i) => sum + i.quantity, 0) || 0;
    const totalReturns = returns?.reduce((sum, r) => sum + r.quantityReturned, 0) || 0;
    const revenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const totalDeposits = items?.filter((i) => i.type === 'Rental').reduce((sum, i) => sum + (i.depositAmount || 0) * i.quantity, 0) || 0;
    const outstandingBalance = orders?.reduce((sum, o) => sum + o.remainingBalance, 0) || 0;

    // 2. Fetch upcoming deliveries / returns (today & tomorrow)
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const todayDeliveries = items?.filter((i) => i.deliveryDate === todayStr || i.expectedReturnDate === todayStr).map((i) => {
      const order = orders?.find((o) => o.id === i.orderId);
      return {
        id: i.id,
        customerName: (order as any)?.Customer?.name || 'مجهول',
        customerPhone: (order as any)?.Customer?.phone || 'مجهول',
        productName: i.name,
        category: i.category,
        quantity: i.quantity,
        type: i.type,
        action: i.deliveryDate === todayStr ? 'Delivery' : 'Return',
        date: i.deliveryDate === todayStr ? i.deliveryDate : i.expectedReturnDate,
      };
    }) || [];

    const tomorrowDeliveries = items?.filter((i) => i.deliveryDate === tomorrowStr || i.expectedReturnDate === tomorrowStr).map((i) => {
      const order = orders?.find((o) => o.id === i.orderId);
      return {
        id: i.id,
        customerName: (order as any)?.Customer?.name || 'مجهول',
        customerPhone: (order as any)?.Customer?.phone || 'مجهول',
        productName: i.name,
        category: i.category,
        quantity: i.quantity,
        type: i.type,
        action: i.deliveryDate === tomorrowStr ? 'Delivery' : 'Return',
        date: i.deliveryDate === tomorrowStr ? i.deliveryDate : i.expectedReturnDate,
      };
    }) || [];

    // 3. Employee stats
    const { data: empData } = await supabase.from('Employee').select('id, name');
    const employeeStats = empData?.map((emp) => {
      const empOrders = orders?.filter((o) => o.employeeId === emp.id) || [];
      const empRevenue = empOrders.reduce((sum, o) => sum + o.totalPaid, 0);
      return {
        id: emp.id,
        name: emp.name,
        ordersCount: empOrders.length,
        revenue: empRevenue,
      };
    }) || [];

    // 4. Recent orders
    const recentOrders = orders?.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5).map((o) => ({
      id: o.id,
      invoiceNumber: o.invoiceNumber,
      customerName: (o as any).Customer?.name || 'مجهول',
      grandTotal: o.grandTotal,
      remainingBalance: o.remainingBalance,
      status: o.status,
      paymentStatus: o.paymentStatus,
      orderDate: o.orderDate,
    })) || [];

    // 5. Outstanding balance alerts near return deadlines
    const outstandingAlerts = items?.filter((i) => i.type === 'Rental' && i.status === 'Rented').map((i) => {
      const order = orders?.find((o) => o.id === i.orderId);
      return {
        orderId: order?.id || '',
        orderNumber: order?.invoiceNumber || '',
        customerName: (order as any)?.Customer?.name || 'مجهول',
        phone: (order as any)?.Customer?.phone || 'مجهول',
        productName: i.name,
        nearestDate: i.expectedReturnDate,
        remainingBalance: order?.remainingBalance || 0,
      };
    }).filter((a) => a.remainingBalance > 0) || [];

    const totalRevenue = revenue;
    const remainingPayments = outstandingBalance;
    const ordersWaiting = orders?.filter((o) => o.deliveryStatus !== 'Returned').length || 0;
    const ordersDelivered = orders?.filter((o) => o.deliveryStatus === 'Returned' || o.deliveryStatus === 'Delivered').length || 0;
    const todayDeliveriesCount = todayDeliveries.length;
    const tomorrowDeliveriesCount = tomorrowDeliveries.length;

    // Calculate mostSoldProducts
    const categoryArabicNames: Record<string, string> = {
      Cap: 'كاب التخرج',
      Hat: 'قبعة التخرج',
      Sash: 'الشال',
      Brooch: 'البروش المخصص',
      Accessory: 'إكسسوارات إضافية',
    };
    const categories = ['Cap', 'Hat', 'Sash', 'Brooch', 'Accessory'];
    const mostSoldProducts = categories.map((cat) => {
      const qty = items?.filter((i) => i.category === cat).reduce((sum, i) => sum + i.quantity, 0) || 0;
      return {
        name: categoryArabicNames[cat] || cat,
        quantity: qty,
      };
    }).sort((a, b) => b.quantity - a.quantity).slice(0, 3);

    return {
      totalOrders,
      totalCustomers,
      totalSales,
      totalRentals,
      totalReturns,
      totalRevenue,
      remainingPayments,
      ordersWaiting,
      ordersDelivered,
      todayDeliveriesCount,
      tomorrowDeliveriesCount,
      todayDeliveries,
      tomorrowDeliveries,
      mostSoldProducts,
      employeeStats,
      latestOrders: recentOrders,
      alerts: outstandingAlerts,
    };
  },

  getSummary: async (start: string, end: string) => {
    // Fetch base records
    const { data: orders } = await supabase
      .from('Order')
      .select('*, Customer!OrderCustomer(name, phone)')
      .gte('orderDate', start)
      .lte('orderDate', end);

    const { data: payments } = await supabase
      .from('Payment')
      .select('*, Employee!PaymentEmployee(name)')
      .gte('paymentDate', start)
      .lte('paymentDate', end);

    const { data: allItems } = await supabase.from('OrderItem').select('*');
    const { data: allReturns } = await supabase.from('ReturnLog').select('*');
    const { data: allEmployees } = await supabase.from('Employee').select('*');

    const totalOrders = orders?.length || 0;
    const orderIds = orders?.map((o) => o.id) || [];
    const customerIds = [...new Set(orders?.map((o) => o.customerId) || [])];
    const totalCustomers = customerIds.length;

    const filteredItems = allItems?.filter((i) => orderIds.includes(i.orderId)) || [];
    const totalSales = filteredItems.filter((i) => i.type === 'Sale').reduce((sum, i) => sum + i.quantity, 0);
    const totalRentals = filteredItems.filter((i) => i.type === 'Rental').reduce((sum, i) => sum + i.quantity, 0);

    const itemIds = filteredItems.map((i) => i.id);
    const totalReturns = allReturns?.filter((r) => itemIds.includes(r.orderItemId)).reduce((sum, r) => sum + r.quantityReturned, 0) || 0;

    const revenue = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const grandTotalGenerated = orders?.reduce((sum, o) => sum + o.grandTotal, 0) || 0;
    const remainingPayments = orders?.reduce((sum, o) => sum + o.remainingBalance, 0) || 0;

    // 1. Employee stats
    const employeeStats = allEmployees?.map((emp) => {
      const empOrders = orders?.filter((o) => o.employeeId === emp.id) || [];
      const empPayments = payments?.filter((p) => p.employeeId === emp.id) || [];
      const empRevenue = empPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: emp.name,
        ordersCount: empOrders.length,
        revenue: empRevenue,
      };
    }) || [];

    // 2. Product breakdown
    const categories = ['Cap', 'Hat', 'Sash', 'Brooch', 'Accessory'];
    const categoryArabicNames: Record<string, string> = {
      Cap: 'كاب التخرج',
      Hat: 'قبعة التخرج',
      Sash: 'الشال',
      Brooch: 'البروش المخصص',
      Accessory: 'إكسسوارات إضافية',
    };

    const productsBreakdown = categories.map((cat) => {
      const catItems = filteredItems.filter((i) => i.category === cat);
      const sales = catItems.filter((i) => i.type === 'Sale').reduce((sum, i) => sum + i.quantity, 0);
      const rentals = catItems.filter((i) => i.type === 'Rental').reduce((sum, i) => sum + i.quantity, 0);
      return {
        name: categoryArabicNames[cat] || cat,
        sales,
        rentals,
        total: sales + rentals,
      };
    });

    // 3. Top Customers
    const customerOrderCounts: Record<string, { name: string; phone: string; count: number; paid: number }> = {};
    orders?.forEach((o) => {
      const custName = (o as any).Customer?.name || 'مجهول';
      const custPhone = (o as any).Customer?.phone || 'مجهول';
      if (!customerOrderCounts[o.customerId]) {
        customerOrderCounts[o.customerId] = {
          name: custName,
          phone: custPhone,
          count: 0,
          paid: 0,
        };
      }
      customerOrderCounts[o.customerId].count += 1;
      customerOrderCounts[o.customerId].paid += o.totalPaid;
    });

    const topCustomers = Object.values(customerOrderCounts)
      .sort((a, b) => b.paid - a.paid)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        phone: c.phone,
        orders: c.count,
        paid: c.paid,
      }));

    return {
      summary: {
        totalOrders,
        totalCustomers,
        totalSales,
        totalRentals,
        totalReturns,
        revenue,
        grandTotalGenerated,
        remainingPayments,
      },
      employeeStats,
      productsBreakdown,
      topCustomers,
    };
  },
};

export const auditService = {
  getAll: async () => {
    const { data: logs } = await supabase
      .from('AuditLog')
      .select('*')
      .order('createdAt', { ascending: false });
    return logs || [];
  },
};

export default authService;
