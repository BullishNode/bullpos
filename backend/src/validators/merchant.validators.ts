import { z } from 'zod';

// Profile update validation
export const updateProfileSchema = z.object({
  storeName: z.string().min(1).max(255).optional(),
  websiteUrl: z.string().url().max(500).optional(),
  description: z.string().max(2000).optional(),
  language: z.enum(['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh']).optional(),
  currency: z.enum(['BTC', 'SAT', 'USD', 'EUR', 'CAD', 'GBP', 'JPY']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
