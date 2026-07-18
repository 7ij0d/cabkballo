import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'graduation-store-super-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    employeeId: string;
    username: string;
    name: string;
  };
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token is invalid or expired' });
      }

      (req as AuthenticatedRequest).user = user as any;
      next();
    });
  } else {
    res.status(401).json({ error: 'Authorization header is required' });
  }
}
