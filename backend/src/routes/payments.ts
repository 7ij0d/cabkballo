import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';
import { logAction } from '../middleware/logger';

const router = Router();

// POST add a payment to an order
router.post('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      orderId,
      amount,
      paymentDate,
      paymentMethod,
      customMethodText,
      notes,
      employeeId // Employee who received the payment
    } = req.body;

    const creatorId = req.user?.employeeId!;
    const creatorName = req.user?.name!;

    if (!orderId || !amount || !paymentMethod || !employeeId) {
      return res.status(400).json({ error: 'معرف الطلب، القيمة، طريقة الدفع، والمستلم حقول إجبارية' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true } },
        payments: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }

    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) {
      return res.status(400).json({ error: 'قيمة الدفعة يجب أن تكون أكبر من صفر' });
    }

    // Run database operations in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Payment
      const payment = await tx.payment.create({
        data: {
          orderId,
          amount: payAmount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          paymentMethod,
          customMethodText,
          notes,
          employeeId
        },
        include: {
          employee: { select: { name: true } }
        }
      });

      // 2. Fetch all payments including the new one to recalculate
      const allPayments = await tx.payment.findMany({
        where: { orderId }
      });

      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = Math.max(0, order.grandTotal - totalPaid);

      // Determine Payment Status
      let paymentStatus = 'Unpaid';
      if (totalPaid === 0) {
        paymentStatus = 'Unpaid';
      } else if (totalPaid >= order.grandTotal) {
        paymentStatus = 'FullyPaid';
      } else {
        // If there's only 1 payment transaction, we classify it as DepositPaid
        // If there are more, it's PartiallyPaid
        if (allPayments.length === 1) {
          paymentStatus = 'DepositPaid';
        } else {
          paymentStatus = 'PartiallyPaid';
        }
      }

      // 3. Update Order
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          totalPaid,
          remainingBalance,
          paymentStatus
        }
      });

      return { payment, updatedOrder };
    });

    // Get info of employee who received payment for log
    const receiverEmployee = await prisma.employee.findUnique({ where: { id: employeeId } });

    await logAction(
      creatorId,
      'ADD_PAYMENT',
      `قام الموظف ${creatorName} بإدخال دفعة بقيمة ${payAmount} د.ل للطلب ${order.orderNumber} (الزبون: ${order.customer.name}) المستلم: ${receiverEmployee?.name}`
    );

    return res.status(201).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء إضافة الدفعة' });
  }
});

// GET payment history for a specific order
router.get('/order/:orderId', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    const payments = await prisma.payment.findMany({
      where: { orderId },
      include: {
        employee: { select: { name: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });

    return res.json(payments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل الدفعات' });
  }
});

export default router;
