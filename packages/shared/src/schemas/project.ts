import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, 'Project name is required'),
  description: z.string().nullable().optional(),
  url: z.string().url().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  learnings: z.string().nullable().optional(),
  technologies: z.array(z.string()).nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createProjectSchema = projectSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateProjectSchema = createProjectSchema.partial();

export type Project = z.infer<typeof projectSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type UpdateProject = z.infer<typeof updateProjectSchema>;
