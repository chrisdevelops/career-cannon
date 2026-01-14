import { z } from 'zod';

export const educationSchema = z.object({
  id: z.string().cuid().optional(),
  institution: z.string().min(1, 'Institution is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().nullable().optional(),
  startDate: z.coerce.date().nullable().optional(),
  endDate: z.coerce.date().nullable().optional(),
  gpa: z.string().nullable().optional(),
  honors: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createEducationSchema = educationSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateEducationSchema = createEducationSchema.partial();

export type Education = z.infer<typeof educationSchema>;
export type CreateEducation = z.infer<typeof createEducationSchema>;
export type UpdateEducation = z.infer<typeof updateEducationSchema>;
