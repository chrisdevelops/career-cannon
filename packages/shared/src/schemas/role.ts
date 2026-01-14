import { z } from 'zod';

export const roleSchema = z.object({
  id: z.string().cuid().optional(),
  company: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().nullable().optional(),
  current: z.boolean().default(false),
  description: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createRoleSchema = roleSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateRoleSchema = createRoleSchema.partial();

export type Role = z.infer<typeof roleSchema>;
export type CreateRole = z.infer<typeof createRoleSchema>;
export type UpdateRole = z.infer<typeof updateRoleSchema>;
