import { z } from 'zod';

// Profile update validation
export const updateProfileSchema = z.object({
  storeName: z.string().min(1).max(255).optional(),
  websiteUrl: z.string().url().max(500)
    .refine(url => url.startsWith('http://') || url.startsWith('https://'), {
      message: 'Website URL must use HTTP or HTTPS protocol'
    })
    .optional(),
  description: z.string().max(2000).optional(),
  language: z.enum(['en', 'es', 'fr', 'de', 'pt', 'ja', 'zh']).optional(),
  currency: z.enum(['BTC', 'SAT', 'USD', 'EUR', 'CAD', 'GBP', 'JPY']).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
