import { Router, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../utils/db';
import { logAction } from '../middleware/logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'graduation-store-super-secret-key-2026';

// Employee Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
    }

    const employee = await prisma.employee.findUnique({
      where: { username: username.toLowerCase().trim() },
    });

    if (!employee) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const isPasswordValid = await bcrypt.compare(password, employee.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        employeeId: employee.id,
        username: employee.username,
        name: employee.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Audit Log login
    await logAction(employee.id, 'LOGIN', `قام الموظف ${employee.name} بتسجيل الدخول إلى النظام`);

    return res.json({
      token,
      employee: {
        id: employee.id,
        username: employee.username,
        name: employee.name,
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
  }
});

export default router;
