import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { logAction } from '../middleware/logger';

const router = Router();

// GET all return logs in the system
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const returns = await prisma.returnLog.findMany({
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                customer: { select: { name: true } }
              }
            }
          }
        },
        employee: { select: { name: true } }
      },
      orderBy: { returnDate: 'desc' }
    });

    // Format for display
    const formatted = returns.map((r) => ({
      id: r.id,
      customerName: r.orderItem.order.customer.name,
      orderNumber: r.orderItem.order.orderNumber,
      orderId: r.orderItem.orderId,
      category: r.orderItem.category,
      customCategory: r.orderItem.customCategory,
      quantityReturned: r.quantityReturned,
      returnDate: r.returnDate,
      condition: r.condition,
      customCondition: r.customCondition,
      notes: r.notes,
      employeeName: r.employee.name
    }));

    return res.json(formatted);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل المرجوعات' });
  }
});

// POST register a new return
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      orderItemId,
      quantityReturned,
      returnDate,
      condition,
      customCondition,
      notes,
      employeeId // Employee who processed the return
    } = req.body;

    const creatorId = req.user?.employeeId!;
    const creatorName = req.user?.name!;

    if (!orderItemId || !quantityReturned || !condition || !employeeId) {
      return res.status(400).json({ error: 'معرف المنتج، الكمية المرجعة، الحالة، والمستلم حقول إجبارية' });
    }

    const qty = parseInt(quantityReturned);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'الكمية المرجعة يجب أن تكون أكبر من الصفر' });
    }

    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: {
            customer: { select: { name: true } }
          }
        }
      }
    });

    if (!orderItem) {
      return res.status(404).json({ error: 'المنتج المطلوب إرجاعه غير موجود في الطلب' });
    }

    // Run in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Return Log
      const log = await tx.returnLog.create({
        data: {
          orderItemId,
          quantityReturned: qty,
          returnDate: returnDate ? new Date(returnDate) : new Date(),
          condition,
          customCondition,
          notes,
          employeeId
        },
        include: {
          employee: { select: { name: true } }
        }
      });

      // 2. Update Order Item status to "Returned"
      const updatedItem = await tx.orderItem.update({
        where: { id: orderItemId },
        data: {
          status: 'Returned'
        }
      });

      // 3. Optional: Check if all items in this order are delivered/returned, and auto update order status
      // We can do this on order save or keep it simple.

      return { log, updatedItem };
    });

    const receiverEmployee = await prisma.employee.findUnique({ where: { id: employeeId } });

    await logAction(
      creatorId,
      'RETURN_PRODUCT',
      `قام الموظف ${creatorName} بتسجيل إرجاع كمية ${qty} من (${orderItem.category}) في الطلب ${orderItem.order.orderNumber} (الزبون: ${orderItem.order.customer.name}) المستلم: ${receiverEmployee?.name}`
    );

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل المرجوعات' });
  }
});

export default router;
