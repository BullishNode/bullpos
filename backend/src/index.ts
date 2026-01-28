/**
 * BullPOS Backend
 * Express + SQLite server for encrypted payment links
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
const PORT = process.env.PORT || 3000;

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

// TODO: Add routes
// - POST /api/auth/login
// - POST /api/merchants/register
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

app.listen(PORT, () => {
  console.log(`BullPOS Backend running on port ${PORT}`);
});

export default app;
