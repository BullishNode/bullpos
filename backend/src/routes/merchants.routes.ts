import { Router, Request, Response } from 'express';
import { authenticateMerchant } from '../middleware/auth.middleware';
import { updateProfileSchema } from '../validators/merchant.validators';
import * as merchantService from '../services/merchant.service';
import { ZodError } from 'zod';

export const merchantsRouter = Router();

// GET /api/merchants/profile - Get authenticated merchant's profile
merchantsRouter.get('/profile', authenticateMerchant, (req: Request, res: Response) => {
  const merchantId = req.merchantId!;

  const profile = merchantService.getProfile(merchantId);

  if (!profile) {
    res.status(404).json({ error: 'Profile not found' });
    return;
  }

  res.json(profile);
});

// PUT /api/merchants/profile - Update authenticated merchant's profile
merchantsRouter.put('/profile', authenticateMerchant, (req: Request, res: Response) => {
  const merchantId = req.merchantId!;

  try {
    const updates = updateProfileSchema.parse(req.body);
    const updatedProfile = merchantService.updateProfile(merchantId, updates);

    if (!updatedProfile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(updatedProfile);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
      return;
    }
    throw error;
  }
});

// GET /api/merchants/:id/pgp - Get merchant's PGP public key (public endpoint)
merchantsRouter.get('/:id/pgp', (req: Request, res: Response) => {
  const { id } = req.params;

  const pgpKey = merchantService.getPgpPublicKey(id);

  if (!pgpKey) {
    res.status(404).json({ error: 'Merchant not found' });
    return;
  }

  res.json({ pgpPublicKey: pgpKey });
});
