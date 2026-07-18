import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET dashboard statistics
router.get('/dashboard', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // 1. Basic Counts
    const totalOrders = await prisma.order.count();
    const totalCustomers = await prisma.customer.count();

    // 2. Sales vs Rentals counts
    const salesCount = await prisma.orderItem.count({
      where: {
        OR: [
          { operationType: 'Sale' },
          { operationType: null }
        ]
      }
    });

    const rentalsCount = await prisma.orderItem.count({
      where: { operationType: 'Rental' }
    });

    const returnsLogCount = await prisma.returnLog.aggregate({
      _sum: { quantityReturned: true }
    });
    const totalReturns = returnsLogCount._sum.quantityReturned || 0;

    // 3. Financials
    const totalRevenueSum = await prisma.payment.aggregate({
      _sum: { amount: true }
    });
    const totalRevenue = totalRevenueSum._sum.amount || 0;

    const remainingPaymentsSum = await prisma.order.aggregate({
      _sum: { remainingBalance: true }
    });
    const remainingPayments = remainingPaymentsSum._sum.remainingBalance || 0;

    // 4. Deliveries (from OrderItems)
    const todayDeliveries = await prisma.orderItem.findMany({
      where: {
        deliveryDate: {
          gte: today,
          lte: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
        }
      },
      include: {
        order: {
          include: { customer: { select: { name: true, phone: true } } }
        }
      }
    });

    const tomorrowDeliveries = await prisma.orderItem.findMany({
      where: {
        deliveryDate: {
          gte: tomorrow,
          lte: endOfTomorrow
        }
      },
      include: {
        order: {
          include: { customer: { select: { name: true, phone: true } } }
        }
      }
    });

    // 5. Orders by Status
    const ordersWaiting = await prisma.order.count({
      where: { status: { in: ['Pending', 'Preparing', 'Ready'] } }
    });

    const ordersDelivered = await prisma.order.count({
      where: { status: { in: ['Delivered', 'Completed'] } }
    });

    // 6. Most Sold Categories
    const items = await prisma.orderItem.findMany({
      select: { category: true, customCategory: true, quantity: true }
    });

    const productSalesMap: Record<string, number> = {};
    items.forEach((item) => {
      const name = item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category;
      productSalesMap[name] = (productSalesMap[name] || 0) + item.quantity;
    });

    const mostSoldProducts = Object.entries(productSalesMap)
      .map(([name, qty]) => ({ name, quantity: qty }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 7. Employee Statistics (Anas & Taha)
    const employees = await prisma.employee.findMany({
      include: {
        orders: {
          select: { grandTotal: true, totalPaid: true }
        },
        payments: {
          select: { amount: true }
        }
      }
    });

    const employeeStats = employees.map((emp) => {
      const ordersCount = emp.orders.length;
      const revenue = emp.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        id: emp.id,
        name: emp.name,
        ordersCount,
        revenue
      };
    });

    // 8. Latest 5 Orders
    const latestOrders = await prisma.order.findMany({
      take: 5,
      include: {
        customer: { select: { name: true } },
        employee: { select: { name: true } }
      },
      orderBy: { orderDate: 'desc' }
    });

    // 9. Notifications/Alerts (Outstanding balance + Delivery/Graduation Date near - within 3 days)
    const warningThresholdDate = new Date();
    warningThresholdDate.setDate(warningThresholdDate.getDate() + 3);

    const outstandingBalanceAlerts = await prisma.order.findMany({
      where: {
        remainingBalance: { gt: 0 },
        status: { notIn: ['Cancelled'] },
        items: {
          some: {
            OR: [
              { deliveryDate: { lte: warningThresholdDate, gte: today } },
              { graduationDate: { lte: warningThresholdDate, gte: today } }
            ]
          }
        }
      },
      include: {
        customer: { select: { name: true, phone: true } },
        items: {
          select: { deliveryDate: true, graduationDate: true }
        }
      }
    });

    const alerts = outstandingBalanceAlerts.map((o) => {
      const dates = o.items
        .flatMap((i) => [i.deliveryDate, i.graduationDate])
        .filter((d): d is Date => d !== null);

      const nearestDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;

      return {
        orderId: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer.name,
        phone: o.customer.phone,
        remainingBalance: o.remainingBalance,
        nearestDate
      };
    });

    return res.json({
      totalOrders,
      totalCustomers,
      totalSales: salesCount,
      totalRentals: rentalsCount,
      totalReturns,
      totalRevenue,
      remainingPayments,
      ordersWaiting,
      ordersDelivered,
      todayDeliveriesCount: todayDeliveries.length,
      tomorrowDeliveriesCount: tomorrowDeliveries.length,
      todayDeliveries: todayDeliveries.map(d => ({
        id: d.id,
        customerName: d.order.customer.name,
        phone: d.order.customer.phone,
        category: d.category,
        customCategory: d.customCategory,
        quantity: d.quantity,
        status: d.status
      })),
      tomorrowDeliveries: tomorrowDeliveries.map(d => ({
        id: d.id,
        customerName: d.order.customer.name,
        phone: d.order.customer.phone,
        category: d.category,
        customCategory: d.customCategory,
        quantity: d.quantity,
        status: d.status
      })),
      mostSoldProducts,
      employeeStats,
      latestOrders: latestOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customer.name,
        grandTotal: o.grandTotal,
        paymentStatus: o.paymentStatus,
        status: o.status,
        employeeName: o.employee.name,
        orderDate: o.orderDate
      })),
      alerts
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تحميل إحصائيات لوحة التحكم' });
  }
});

// GET custom reports summary
router.get('/summary', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ error: 'تاريخ البداية والنهاية مطلوبان' });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    endDate.setHours(23, 59, 59, 999);

    // 1. Basic counts in date range
    const totalOrders = await prisma.order.count({
      where: { orderDate: { gte: startDate, lte: endDate } }
    });

    const uniqueCustomersCount = await prisma.order.findMany({
      where: { orderDate: { gte: startDate, lte: endDate } },
      select: { customerId: true },
      distinct: ['customerId']
    });
    const totalCustomers = uniqueCustomersCount.length;

    const salesCount = await prisma.orderItem.count({
      where: {
        order: { orderDate: { gte: startDate, lte: endDate } },
        OR: [
          { operationType: 'Sale' },
          { operationType: null }
        ]
      }
    });

    const rentalsCount = await prisma.orderItem.count({
      where: {
        order: { orderDate: { gte: startDate, lte: endDate } },
        operationType: 'Rental'
      }
    });

    const returnsLogCount = await prisma.returnLog.aggregate({
      where: { returnDate: { gte: startDate, lte: endDate } },
      _sum: { quantityReturned: true }
    });
    const totalReturns = returnsLogCount._sum.quantityReturned || 0;

    // 2. Financials in date range
    const revenueSum = await prisma.payment.aggregate({
      where: { paymentDate: { gte: startDate, lte: endDate } },
      _sum: { amount: true }
    });
    const revenue = revenueSum._sum.amount || 0;

    const ordersSum = await prisma.order.aggregate({
      where: { orderDate: { gte: startDate, lte: endDate } },
      _sum: { grandTotal: true, totalPaid: true, remainingBalance: true }
    });

    const grandTotalGenerated = ordersSum._sum.grandTotal || 0;
    const remainingPayments = ordersSum._sum.remainingBalance || 0;

    // 3. Employee breakdown in date range
    const employees = await prisma.employee.findMany({
      include: {
        orders: {
          where: { orderDate: { gte: startDate, lte: endDate } },
          select: { grandTotal: true }
        },
        payments: {
          where: { paymentDate: { gte: startDate, lte: endDate } },
          select: { amount: true }
        }
      }
    });

    const employeeStats = employees.map((emp) => {
      const ordersCount = emp.orders.length;
      const revenueCollected = emp.payments.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: emp.name,
        ordersCount,
        revenue: revenueCollected
      };
    });

    // 4. Products Sold Breakdown
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { orderDate: { gte: startDate, lte: endDate } }
      },
      select: { category: true, customCategory: true, quantity: true, operationType: true }
    });

    const productSalesMap: Record<string, { sales: number; rentals: number }> = {};
    orderItems.forEach((item) => {
      const name = item.category === 'Other' ? (item.customCategory || 'أخرى') : item.category;
      if (!productSalesMap[name]) {
        productSalesMap[name] = { sales: 0, rentals: 0 };
      }
      if (item.operationType === 'Rental') {
        productSalesMap[name].rentals += item.quantity;
      } else {
        productSalesMap[name].sales += item.quantity;
      }
    });

    const productsBreakdown = Object.entries(productSalesMap).map(([name, counts]) => ({
      name,
      sales: counts.sales,
      rentals: counts.rentals,
      total: counts.sales + counts.rentals
    })).sort((a, b) => b.total - a.total);

    // 5. Active Customers list in date range
    const activeCustomers = await prisma.order.findMany({
      where: { orderDate: { gte: startDate, lte: endDate } },
      include: { customer: { select: { name: true, phone: true } } }
    });

    const customerStatsMap: Record<string, { name: string; phone: string; orders: number; paid: number }> = {};
    activeCustomers.forEach((o) => {
      const id = o.customerId;
      if (!customerStatsMap[id]) {
        customerStatsMap[id] = { name: o.customer.name, phone: o.customer.phone, orders: 0, paid: 0 };
      }
      customerStatsMap[id].orders += 1;
      customerStatsMap[id].paid += o.totalPaid;
    });

    const topCustomers = Object.values(customerStatsMap)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    return res.json({
      summary: {
        totalOrders,
        totalCustomers,
        totalSales: salesCount,
        totalRentals: rentalsCount,
        totalReturns,
        revenue, // actual cash received in range
        grandTotalGenerated, // invoice amounts in range
        remainingPayments
      },
      employeeStats,
      productsBreakdown,
      topCustomers
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إنشاء التقرير المخصص' });
  }
});

export default router;
