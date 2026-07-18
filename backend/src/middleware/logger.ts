import prisma from '../utils/db';

export async function logAction(employeeId: string, action: string, details: string) {
  try {
    await prisma.auditLog.create({
      data: {
        employeeId,
        action,
        details,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
