import { z } from 'zod';

// Standard API response wrapper
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });

// Resume import schemas
export const resumeImportRequestSchema = z.object({
  content: z.string().min(1, 'Resume content is required'),
  format: z.enum(['text', 'markdown']).default('text'),
});

export const parsedResumeItemSchema = z.object({
  id: z.string(), // temporary ID for tracking during review
  type: z.enum(['role', 'experienceItem', 'achievement', 'skill', 'education', 'project']),
  data: z.unknown(),
  confidence: z.number().min(0).max(1),
  duplicateOf: z.string().nullable().optional(), // ID of existing item if duplicate detected
  duplicateScore: z.number().min(0).max(1).nullable().optional(),
});

export const resumeImportResponseSchema = z.object({
  items: z.array(parsedResumeItemSchema),
  rawExtraction: z.string(), // Original AI extraction for debugging
});

export const commitImportRequestSchema = z.object({
  items: z.array(z.object({
    id: z.string(), // temp ID from parsing
    action: z.enum(['accept', 'reject', 'merge']),
    mergeWithId: z.string().optional(), // if action is merge
    modifications: z.unknown().optional(), // user edits before committing
  })),
});

export type ApiResponse<T> = { success: true; data: T };
export type ApiError = z.infer<typeof apiErrorSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type ResumeImportRequest = z.infer<typeof resumeImportRequestSchema>;
export type ParsedResumeItem = z.infer<typeof parsedResumeItemSchema>;
export type ResumeImportResponse = z.infer<typeof resumeImportResponseSchema>;
export type CommitImportRequest = z.infer<typeof commitImportRequestSchema>;
