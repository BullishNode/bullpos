/**
 * BullPOS Backend
 * Express + SQLite server for encrypted payment links
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './db/schema';
import { merchantsRouter } from './routes/merchants.routes';

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

// Trust proxy configuration (required when running behind reverse proxies like nginx, AWS ALB, Cloudflare)
// This allows Express to correctly read client IP from X-Forwarded-For headers
// Required for accurate rate limiting and logging
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for encrypted blobs

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/merchants', merchantsRouter);

// Global error handler (must be after all routes)
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// TODO: Add remaining routes
// - POST /api/auth/login
// - POST /api/merchants/register
// - POST /api/links
// - GET /api/links/:id
// - GET /api/links
// - DELETE /api/links/:id
// - POST /api/backups
// - PUT /api/backups/:id
// - GET /api/backups
// - GET /api/backups/:id

app.listen(PORT, () => {
  console.log(`BullPOS Backend running on port ${PORT}`);
});

export default app;
