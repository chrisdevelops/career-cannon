import { z } from 'zod';

export const skillCategorySchema = z.enum([
  'technical',
  'soft',
  'tool',
  'language'
]);

export const skillProficiencySchema = z.enum([
  'expert',
  'advanced',
  'intermediate',
  'beginner'
]);

export const skillSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'Skill name is required'),
  category: skillCategorySchema.nullable().optional(),
  proficiency: skillProficiencySchema.nullable().optional(),
  evidence: z.array(z.string()).nullable().optional(), // references to roles/achievements
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createSkillSchema = skillSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateSkillSchema = createSkillSchema.partial();

export type SkillCategory = z.infer<typeof skillCategorySchema>;
export type SkillProficiency = z.infer<typeof skillProficiencySchema>;
export type Skill = z.infer<typeof skillSchema>;
export type CreateSkill = z.infer<typeof createSkillSchema>;
export type UpdateSkill = z.infer<typeof updateSkillSchema>;
