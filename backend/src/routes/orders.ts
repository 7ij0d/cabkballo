import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { logAction } from '../middleware/logger';

const router = Router();

// Helper to generate next order number
async function generateOrderNumber(): Promise<string> {
  const count = await prisma.order.count();
  const currentYear = new Date().getFullYear();
  return `ORD-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;
}

// GET all orders with filters
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      employeeId,
      status,
      paymentStatus,
      deliveryStatus,
      dateRange, // "today", "yesterday", "week", "month", "year"
      operationType // "Sale", "Rental", "Return"
    } = req.query;

    const where: any = {};

    // 1. Employee Filter
    if (employeeId && employeeId !== 'all') {
      where.employeeId = employeeId;
    }

    // 2. Order Status Filter
    if (status && status !== 'all') {
      where.status = status;
    }

    // 3. Payment Status Filter
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }

    // 4. Delivery Status Filter (searches items)
    if (deliveryStatus && deliveryStatus !== 'all') {
      where.items = {
        some: {
          status: deliveryStatus
        }
      };
    }

    // 5. Operation Type Filter (Sale / Rental)
    if (operationType && operationType !== 'all') {
      if (operationType === 'Return') {
        // Find orders containing items that have returns
        where.items = {
          some: {
            returns: {
              some: {}
            }
          }
        };
      } else {
        where.items = {
          some: {
            operationType: operationType
          }
        };
      }
    }

    // 6. Date Range Filters
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        where.orderDate = { gte: startDate, lte: endDate };
      } else if (dateRange === 'yesterday') {
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(now.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        where.orderDate = { gte: startDate, lte: endDate };
      } else if (dateRange === 'week') {
        // Start of current week (7 days ago)
        startDate.setDate(now.getDate() - 7);
        where.orderDate = { gte: startDate };
      } else if (dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
        where.orderDate = { gte: startDate };
      } else if (dateRange === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
        where.orderDate = { gte: startDate };
      }
    }

    // 7. Global Search (Customer Name, Phone, Order number, notes)
    if (search) {
      const searchStr = search as string;
      where.OR = [
        { orderNumber: { contains: searchStr } },
        { notes: { contains: searchStr } },
        {
          customer: {
            OR: [
              { name: { contains: searchStr } },
              { phone: { contains: searchStr } }
            ]
          }
        },
        {
          employee: {
            name: { contains: searchStr }
          }
        }
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, phone: true } },
        employee: { select: { name: true } },
        items: true
      },
      orderBy: { orderDate: 'desc' }
    });

    return res.json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الطلبات' });
  }
});

// GET single order details
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        employee: { select: { id: true, name: true } },
        items: {
          include: {
            returns: {
              include: {
                employee: { select: { name: true } }
              }
            }
          }
        },
        payments: {
          include: {
            employee: { select: { name: true } }
          },
          orderBy: { paymentDate: 'asc' }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    return res.json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب تفاصيل الطلب' });
  }
});

// POST create a new order with items
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      customerName,
      customerPhone,
      customerNotes,
      employeeId, // Dropped down employee id (Anas/Taha)
      orderDate,
      notes,
      discount = 0,
      items = [] // Array of OrderItem
    } = req.body;

    const creatorEmployeeId = req.user?.employeeId!;
    const creatorEmployeeName = req.user?.name!;

    if (!customerName || !customerPhone || !employeeId) {
      return res.status(400).json({ error: 'الاسم، رقم الهاتف، والموظف حقول إجبارية' });
    }

    if (items.length === 0) {
      return res.status(400).json({ error: 'يجب إضافة منتج واحد على الأقل للطلب' });
    }

    // 1. Transaction to create customer (if new) & order
    const result = await prisma.$transaction(async (tx) => {
      // Find or create customer
      let customer = await tx.customer.findUnique({
        where: { name: customerName.trim() }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            notes: customerNotes
          }
        });
      } else {
        // Update phone if needed
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: { phone: customerPhone.trim() }
        });
      }

      // Generate invoice number
      const count = await tx.order.count();
      const currentYear = new Date(orderDate || new Date()).getFullYear();
      const orderNumber = `ORD-${currentYear}-${(count + 1).toString().padStart(4, '0')}`;

      // Calculate totals
      let subtotal = 0;
      items.forEach((item: any) => {
        subtotal += (item.quantity || 1) * (item.unitPrice || 0);
      });

      const grandTotal = Math.max(0, subtotal - parseFloat(discount));
      const totalPaid = 0.0;
      const remainingBalance = grandTotal;
      const paymentStatus = 'Unpaid';

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          employeeId,
          orderDate: orderDate ? new Date(orderDate) : new Date(),
          status: 'Pending',
          notes,
          subtotal,
          discount: parseFloat(discount),
          grandTotal,
          totalPaid,
          remainingBalance,
          paymentStatus,
          items: {
            create: items.map((item: any) => ({
              category: item.category,
              customCategory: item.customCategory,
              capType: item.capType,
              customCapType: item.customCapType,
              capSize: item.capSize,
              customCapSize: item.customCapSize,
              capColor: item.capColor,
              customCapColor: item.customCapColor,
              operationType: item.operationType,
              customOperation: item.customOperation,
              saleType: item.saleType,
              customSaleType: item.customSaleType,
              broochType: item.broochType,
              customBroochType: item.customBroochType,
              accessoryName: item.accessoryName,
              customAccessoryName: item.customAccessoryName,
              quantity: parseInt(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              depositAmount: parseFloat(item.depositAmount) || 0,
              deliveryDate: item.deliveryDate ? new Date(item.deliveryDate) : null,
              returnDate: item.returnDate ? new Date(item.returnDate) : null,
              graduationDate: item.graduationDate ? new Date(item.graduationDate) : null,
              notes: item.notes,
              status: 'Waiting'
            }))
          }
        },
        include: {
          items: true
        }
      });

      return newOrder;
    });

    // Get selected employee info for log
    const targetEmployee = await prisma.employee.findUnique({ where: { id: employeeId } });
    await logAction(
      creatorEmployeeId,
      'CREATE_ORDER',
      `قام الموظف ${creatorEmployeeName} بإنشاء الفاتورة ${result.orderNumber} باسم الزبون ${customerName} (بإدارة الموظف: ${targetEmployee?.name})`
    );

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء الطلب' });
  }
});

// PUT update order status or details
router.put('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, discount, notes, employeeId, orderDate } = req.body;
    const modifierId = req.user?.employeeId!;
    const modifierName = req.user?.name!;

    const currentOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!currentOrder) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const updatedData: any = {};
    if (status) updatedData.status = status;
    if (notes !== undefined) updatedData.notes = notes;
    if (employeeId) updatedData.employeeId = employeeId;
    if (orderDate) updatedData.orderDate = new Date(orderDate);

    if (discount !== undefined) {
      const disc = parseFloat(discount) || 0;
      updatedData.discount = disc;
      const subtotal = currentOrder.subtotal;
      const grandTotal = Math.max(0, subtotal - disc);
      updatedData.grandTotal = grandTotal;
      updatedData.remainingBalance = Math.max(0, grandTotal - currentOrder.totalPaid);

      // Re-evaluate payment status
      if (currentOrder.totalPaid === 0) {
        updatedData.paymentStatus = 'Unpaid';
      } else if (currentOrder.totalPaid >= grandTotal) {
        updatedData.paymentStatus = 'FullyPaid';
      } else {
        updatedData.paymentStatus = 'PartiallyPaid';
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updatedData,
      include: { customer: true }
    });

    await logAction(
      modifierId,
      'UPDATE_ORDER',
      `قام الموظف ${modifierName} بتحديث معلومات الفاتورة ${updatedOrder.orderNumber} (حالة الطلب: ${status || currentOrder.status})`
    );

    return res.json(updatedOrder);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تعديل الطلب' });
  }
});

// DELETE an order
router.delete('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employeeId = req.user?.employeeId!;
    const employeeName = req.user?.name!;

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    await prisma.order.delete({
      where: { id }
    });

    await logAction(
      employeeId,
      'DELETE_ORDER',
      `قام الموظف ${employeeName} بحذف الفاتورة رقم ${order.orderNumber}`
    );

    return res.json({ message: 'تم حذف الفاتورة بنجاح' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء حذف الفاتورة' });
  }
});

// PUT update specific order item status (delivery status)
router.put('/items/:itemId/status', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body; // Waiting, Ready, Delivered, Returned
    const employeeId = req.user?.employeeId!;
    const employeeName = req.user?.name!;

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: { order: true }
    });

    if (!orderItem) {
      return res.status(404).json({ error: 'المنتج غير موجود' });
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: { status }
    });

    await logAction(
      employeeId,
      'UPDATE_ITEM_STATUS',
      `قام الموظف ${employeeName} بتحديث حالة تسليم المنتج (${orderItem.category}) في الطلب ${orderItem.order.orderNumber} إلى (${status})`
    );

    return res.json(updatedItem);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث حالة تسليم المنتج' });
  }
});

export default router;
