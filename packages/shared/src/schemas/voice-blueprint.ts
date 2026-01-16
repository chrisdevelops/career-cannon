import { z } from 'zod';

export const toneSchema = z.enum([
  'professional',
  'casual',
  'confident',
  'humble',
  'enthusiastic',
  'authoritative'
]);

export const formalitySchema = z.enum([
  'formal',
  'semi-formal',
  'informal'
]);

export const sentenceLengthSchema = z.enum([
  'short',
  'medium',
  'long',
  'varied'
]);

export const voiceBlueprintSchema = z.object({
  id: z.string().cuid().optional(),
  tone: toneSchema.nullable().optional(),
  formality: formalitySchema.nullable().optional(),
  sentenceLength: sentenceLengthSchema.nullable().optional(),
  audience: z.string().nullable().optional(),
  pointOfView: z.string().nullable().optional(),
  energy: z.string().nullable().optional(),
  confidence: z.string().nullable().optional(),
  pacing: z.string().nullable().optional(),
  structureStyle: z.string().nullable().optional(),
  emphasis: z.string().nullable().optional(),
  vocabularyNotes: z.string().nullable().optional(),
  grammarNotes: z.string().nullable().optional(),
  punctuationStyle: z.string().nullable().optional(),
  preferredVerbs: z.array(z.string()).nullable().optional(),
  preferredPhrases: z.array(z.string()).nullable().optional(),
  bannedPhrases: z.array(z.string()).nullable().optional(),
  avoid: z.array(z.string()).nullable().optional(),
  samples: z.array(z.string()).nullable().optional(),
  samplePairs: z.array(z.object({
    prompt: z.string(),
    response: z.string(),
  })).nullable().optional(),
  customPrompt: z.string().nullable().optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export const createVoiceBlueprintSchema = voiceBlueprintSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateVoiceBlueprintSchema = createVoiceBlueprintSchema.partial();

export type Tone = z.infer<typeof toneSchema>;
export type Formality = z.infer<typeof formalitySchema>;
export type SentenceLength = z.infer<typeof sentenceLengthSchema>;
export type VoiceBlueprint = z.infer<typeof voiceBlueprintSchema>;
export type CreateVoiceBlueprint = z.infer<typeof createVoiceBlueprintSchema>;
export type UpdateVoiceBlueprint = z.infer<typeof updateVoiceBlueprintSchema>;
