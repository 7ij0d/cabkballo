import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { logAction } from '../middleware/logger';

const router = Router();

// GET all customers with aggregated statistics
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = req.query.search as string;

    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search } },
          { phone: { contains: search } },
        ],
      };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        orders: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map customers with aggregates
    const formattedCustomers = customers.map((c) => {
      const orderCount = c.orders.length;
      let totalPaid = 0;
      let remainingBalance = 0;
      let lastOrderDate = null;

      if (orderCount > 0) {
        // Last order date
        const sortedOrders = [...c.orders].sort(
          (a, b) => b.orderDate.getTime() - a.orderDate.getTime()
        );
        lastOrderDate = sortedOrders[0].orderDate;

        c.orders.forEach((o) => {
          totalPaid += o.totalPaid;
          remainingBalance += o.remainingBalance;
        });
      }

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        notes: c.notes,
        createdAt: c.createdAt,
        lastOrderDate,
        orderCount,
        totalPaid,
        remainingBalance,
      };
    });

    return res.json(formattedCustomers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب قائمة الزبائن' });
  }
});

// GET single customer profile with detailed history
router.get('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            items: true,
            payments: {
              include: {
                employee: { select: { name: true } },
              },
            },
            employee: { select: { name: true } },
          },
          orderBy: { orderDate: 'desc' },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'الزبون غير موجود' });
    }

    // Extract detailed lists
    const orders = customer.orders;
    const payments = orders.flatMap((o) =>
      o.payments.map((p) => ({
        ...p,
        orderNumber: o.orderNumber,
      }))
    ).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());

    const rentals = orders.flatMap((o) =>
      o.items
        .filter((item) => item.operationType === 'Rental')
        .map((item) => ({
          ...item,
          orderNumber: o.orderNumber,
        }))
    );

    // Calculate aggregated metrics
    const orderCount = orders.length;
    let totalPaid = 0;
    let remainingBalance = 0;
    let lastOrderDate = orders.length > 0 ? orders[0].orderDate : null;

    orders.forEach((o) => {
      totalPaid += o.totalPaid;
      remainingBalance += o.remainingBalance;
    });

    return res.json({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      notes: customer.notes,
      createdAt: customer.createdAt,
      lastOrderDate,
      orderCount,
      totalPaid,
      remainingBalance,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        status: o.status,
        grandTotal: o.grandTotal,
        totalPaid: o.totalPaid,
        remainingBalance: o.remainingBalance,
        paymentStatus: o.paymentStatus,
        employeeName: o.employee.name,
        itemsCount: o.items.length,
      })),
      payments,
      rentals,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب ملف الزبون' });
  }
});

// POST create customer
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, notes } = req.body;
    const employeeId = req.user?.employeeId!;
    const employeeName = req.user?.name!;

    if (!name || !phone) {
      return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    // Check unique customer name
    const existing = await prisma.customer.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(400).json({ error: 'زبون بنفس الاسم موجود مسبقاً' });
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        notes,
      },
    });

    await logAction(employeeId, 'CREATE_CUSTOMER', `قام الموظف ${employeeName} بإنشاء الزبون الجديد: ${customer.name}`);

    return res.status(201).json(customer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إضافة الزبون' });
  }
});

// PUT update customer
router.put('/:id', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, phone, notes } = req.body;
    const employeeId = req.user?.employeeId!;
    const employeeName = req.user?.name!;

    if (!name || !phone) {
      return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان' });
    }

    // Check uniqueness excluding current ID
    const existing = await prisma.customer.findFirst({
      where: {
        name: name.trim(),
        id: { not: id },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'زبون بنفس الاسم موجود مسبقاً' });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: {
        name: name.trim(),
        phone: phone.trim(),
        notes,
      },
    });

    await logAction(employeeId, 'UPDATE_CUSTOMER', `قام الموظف ${employeeName} بتحديث معلومات الزبون: ${updatedCustomer.name}`);

    return res.json(updatedCustomer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحديث معلومات الزبون' });
  }
});

export default router;
