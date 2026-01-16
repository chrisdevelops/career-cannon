import { z } from 'zod';

export const entityTypeSchema = z.enum([
  'profile',
  'role',
  'experienceItem',
  'achievement',
  'skill',
  'project',
  'education',
  'voiceBlueprint'
]);

export const actionTypeSchema = z.enum([
  'create',
  'update',
  'delete'
]);

export const changeLogSchema = z.object({
  id: z.string().cuid().optional(),
  entityType: entityTypeSchema,
  entityId: z.string(),
  action: actionTypeSchema,
  beforeSnapshot: z.unknown().nullable().optional(),
  afterSnapshot: z.unknown().nullable().optional(),
  timestamp: z.date().optional(),
  undone: z.boolean().optional(),
  undoneAt: z.date().nullable().optional(),
});

export type EntityType = z.infer<typeof entityTypeSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;
export type ChangeLog = z.infer<typeof changeLogSchema>;
