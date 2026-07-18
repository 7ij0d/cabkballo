import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

import authRouter from './routes/auth';
import customersRouter from './routes/customers';
import ordersRouter from './routes/orders';
import paymentsRouter from './routes/payments';
import returnsRouter from './routes/returns';
import reportsRouter from './routes/reports';
import auditRouter from './routes/audit';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON request body
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/returns', returnsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);

// Serve Static Frontend Files in Production
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// Fallback to React Router client index.html
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // If the path starts with /api, skip to let it error out or handle api route
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), (err) => {
    if (err) {
      // If client build doesn't exist yet, return a simple welcome message
      res.status(200).send('Graduation Store Management System API is running. Client not built yet.');
    }
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'حدث خطأ غير متوقع في الخادم' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
