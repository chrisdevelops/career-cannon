import { z } from 'zod';

export const generationTypeSchema = z.enum([
  'resume',
  'cover_letter'
]);

export const generationSchema = z.object({
  id: z.string().cuid().optional(),
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  temperature: z.number().min(0).max(1).default(0.8),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createGenerationSchema = generationSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const generationVersionSchema = z.object({
  id: z.string().cuid().optional(),
  generationId: z.string().cuid(),
  type: generationTypeSchema,
  content: z.string(),
  chatContext: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).nullable().optional(),
  version: z.number().int().positive(),
  createdAt: z.date().optional(),
});

export const createGenerationVersionSchema = generationVersionSchema.omit({ 
  id: true, 
  createdAt: true 
});

// API request schemas
export const generateResumeRequestSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required'),
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  temperature: z.number().min(0).max(1).default(0.8),
  userPrompt: z.string().optional(),
});

export const generateCoverLetterRequestSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required'),
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  temperature: z.number().min(0).max(1).default(0.8),
  userPrompt: z.string().optional(),
});

export const refineGenerationRequestSchema = z.object({
  generationId: z.string().cuid(),
  versionId: z.string().cuid(),
  userMessage: z.string().min(1, 'Message is required'),
});

export type GenerationType = z.infer<typeof generationTypeSchema>;
export type Generation = z.infer<typeof generationSchema>;
export type CreateGeneration = z.infer<typeof createGenerationSchema>;
export type GenerationVersion = z.infer<typeof generationVersionSchema>;
export type CreateGenerationVersion = z.infer<typeof createGenerationVersionSchema>;
export type GenerateResumeRequest = z.infer<typeof generateResumeRequestSchema>;
export type GenerateCoverLetterRequest = z.infer<typeof generateCoverLetterRequestSchema>;
export type RefineGenerationRequest = z.infer<typeof refineGenerationRequestSchema>;
