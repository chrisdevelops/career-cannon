import { z } from 'zod';

export const achievementSchema = z.object({
  id: z.string().cuid().optional(),
  roleId: z.string().cuid().nullable().optional(),
  problem: z.string().min(1, 'Problem is required'),
  action: z.string().min(1, 'Action is required'),
  outcome: z.string().min(1, 'Outcome is required'),
  metrics: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createAchievementSchema = achievementSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateAchievementSchema = createAchievementSchema.partial();

export type Achievement = z.infer<typeof achievementSchema>;
export type CreateAchievement = z.infer<typeof createAchievementSchema>;
export type UpdateAchievement = z.infer<typeof updateAchievementSchema>;
