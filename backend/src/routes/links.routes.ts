import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import {
  createLink,
  getLinkById,
  listMerchantLinks,
  deleteLink,
} from '../services/link.service.js';
import {
  createLinkSchema,
  linkIdParamSchema,
} from '../validators/link.validators.js';

const router = Router();

/**
 * POST /api/links
 * Create a new encrypted payment link (authenticated)
 */
router.post('/', authenticateToken, (req: Request, res: Response) => {
  try {
    // Validate request body
    const result = createLinkSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid request data', details: result.error.issues });
      return;
    }

    const { encryptedPayload, nonce, expiresAt } = result.data;

    // Create link
    const link = createLink({
      merchantId: req.merchant!.merchantId,
      encryptedPayload,
      nonce,
      expiresAt,
    });

    // Return only the ID and metadata (not the encrypted data)
    res.status(201).json({
      id: link.id,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
    });
  } catch (error) {
    console.error('Create link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/links/:id
 * Fetch encrypted link by ID (public - no authentication required)
 * Returns encrypted blob with merchantId for PGP key lookup
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    // Validate link ID
    const paramResult = linkIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({ error: 'Invalid link ID' });
      return;
    }

    const { id } = paramResult.data;

    // Fetch link
    const link = getLinkById(id);
    if (!link) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    // Check if expired
    if (link.expiresAt && link.expiresAt < Date.now()) {
      res.status(410).json({ error: 'Link has expired' });
      return;
    }

    // Parse encrypted data
    const encryptedData = JSON.parse(link.encryptedData);

    // Return encrypted payload with merchant ID for PGP lookup
    res.json({
      id: link.id,
      merchantId: link.merchantId,
      encryptedPayload: encryptedData.payload,
      nonce: encryptedData.nonce,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      claimedAt: link.claimedAt,
    });
  } catch (error) {
    console.error('Get link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/links
 * List merchant's links (authenticated, metadata only)
 */
router.get('/', authenticateToken, (req: Request, res: Response) => {
  try {
    const links = listMerchantLinks(req.merchant!.merchantId);
    res.json({ links });
  } catch (error) {
    console.error('List links error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/links/:id
 * Delete a link (authenticated, must own the link)
 */
router.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  try {
    // Validate link ID
    const paramResult = linkIdParamSchema.safeParse(req.params);
    if (!paramResult.success) {
      res.status(400).json({ error: 'Invalid link ID' });
      return;
    }

    const { id } = paramResult.data;

    // Attempt to delete (will only delete if owned by merchant)
    const deleted = deleteLink(id, req.merchant!.merchantId);
    if (!deleted) {
      res.status(404).json({ error: 'Link not found or not authorized' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
