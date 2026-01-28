/**
 * BullPOS Backend
 * Express + SQLite server for encrypted payment links
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase } from './db/schema';
import { merchantsRouter } from './routes/merchants.routes';
import { authRouter } from './routes/auth.routes';
import { linksRouter } from './routes/links.routes';
import { backupsRouter } from './routes/backups.routes';
import { publicRateLimiter } from './middleware/rate-limit';
import { validateGeneralPayloadSize } from './middleware/size-limit';
import { requestLogger, securityEventLogger, errorLogger } from './middleware/logging';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database with error handling
try {
  initializeDatabase();
  console.log('Database initialized successfully');
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Security middleware
app.use(helmet());
app.use(cors());

// Request logging (should be early in middleware chain)
app.use(requestLogger);
app.use(securityEventLogger);

// Payload size validation
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for encrypted blobs
app.use(validateGeneralPayloadSize);

// Global rate limiting for all endpoints
app.use(publicRateLimiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/merchants', merchantsRouter);
app.use('/api', authRouter); // Includes /api/merchants/register and /api/auth/login
app.use('/api/links', linksRouter);
app.use('/api/backups', backupsRouter);

// Global error handler (must be after all routes)
app.use(errorLogger);
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Note: Route handlers are stubs (501 responses) pending full implementation in issue #7
// Rate limiting and size validation middleware are now in place and ready to use

app.listen(PORT, () => {
  console.log(`BullPOS Backend running on port ${PORT}`);
});

export default app;
