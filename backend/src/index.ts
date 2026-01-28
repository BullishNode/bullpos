/**
 * BullPOS Backend
 * Express + SQLite server for encrypted payment links
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { db } from './db/index.js';
import authRoutes from './routes/auth.routes.js';
import merchantRoutes from './routes/merchants.routes.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Body parsing - Allow larger payloads for encrypted blobs
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);

// TODO: Add remaining routes
// - GET /api/merchants/profile
// - PUT /api/merchants/profile
// - GET /api/merchants/:id/pgp
// - POST /api/links
// - GET /api/links/:id
// - GET /api/links
// - DELETE /api/links/:id
// - POST /api/backups
// - PUT /api/backups/:id
// - GET /api/backups
// - GET /api/backups/:id

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`BullPOS backend listening on port ${PORT}`);
  console.log(`Database initialized at ${db.name}`);
});

export default app;
