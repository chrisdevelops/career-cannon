import { z } from 'zod';

export const experienceItemTypeSchema = z.enum([
  'responsibility',
  'initiative', 
  'contribution'
]);

export const experienceItemSchema = z.object({
  id: z.string().cuid().optional(),
  roleId: z.string().cuid(),
  content: z.string().min(1, 'Content is required'),
  type: experienceItemTypeSchema.default('responsibility'),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createExperienceItemSchema = experienceItemSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateExperienceItemSchema = createExperienceItemSchema.partial().omit({ roleId: true });

export type ExperienceItemType = z.infer<typeof experienceItemTypeSchema>;
export type ExperienceItem = z.infer<typeof experienceItemSchema>;
export type CreateExperienceItem = z.infer<typeof createExperienceItemSchema>;
export type UpdateExperienceItem = z.infer<typeof updateExperienceItemSchema>;
