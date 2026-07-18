import { Router, Response } from 'express';
import prisma from '../utils/db';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET all audit logs
router.get('/', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        employee: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json(logs.map(log => ({
      id: log.id,
      employeeName: log.employee.name,
      action: log.action,
      details: log.details,
      createdAt: log.createdAt
    })));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل العمليات' });
  }
});

export default router;
