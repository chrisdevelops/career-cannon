import { z } from 'zod';

export const profileSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedin: z.string().url().nullable().optional(),
  github: z.string().url().nullable().optional(),
  website: z.string().url().nullable().optional(),
  summary: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createProfileSchema = profileSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateProfileSchema = createProfileSchema.partial();

export type Profile = z.infer<typeof profileSchema>;
export type CreateProfile = z.infer<typeof createProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
