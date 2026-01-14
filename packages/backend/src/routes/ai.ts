/**
 * AI Service Routes
 * 
 * Endpoints for:
 * - Resume parsing/import
 * - Resume generation
 * - Cover letter generation
 * - Chat-based refinement
 */

import { Router } from 'express';
import { z } from 'zod';
import { success, error, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import {
  parseResume,
  validateParsedResume,
  checkAllDuplicates,
  generateResume,
  generateCoverLetter,
  refineGeneration,
  generateSuggestions,
  getKBContext,
  getOpenAIProvider,
} from '../services/ai/index.js';

const router = Router();

// =============================================================================
// HEALTH CHECK
// =============================================================================

// GET /api/ai/status - Check AI provider status
router.get('/status', (_req, res) => {
  const provider = getOpenAIProvider();
  success(res, {
    provider: provider.name,
    configured: provider.isConfigured(),
  });
});

// =============================================================================
// RESUME IMPORT
// =============================================================================

const parseResumeSchema = z.object({
  content: z.string().min(50, 'Resume content must be at least 50 characters'),
  format: z.enum(['text', 'markdown']).default('text'),
});

// POST /api/ai/parse-resume - Parse resume text into structured data
router.post('/parse-resume', validate(parseResumeSchema), async (req, res) => {
  try {
    const { content } = req.body;

    // Parse the resume
    const { parsed, rawExtraction } = await parseResume(content);

    // Validate and fix any issues
    const { valid, errors, fixed } = validateParsedResume(parsed);

    // Check for duplicates against existing KB
    const duplicateCheck = await checkAllDuplicates({
      roles: fixed.roles,
      skills: fixed.skills,
      education: fixed.education,
      achievements: fixed.achievements,
    });

    success(res, {
      parsed: fixed,
      validation: { valid, errors },
      duplicates: duplicateCheck,
      rawExtraction,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not configured')) {
      error(res, 'AI_NOT_CONFIGURED', err.message, 503);
      return;
    }
    serverError(res, err);
  }
});

// =============================================================================
// RESUME GENERATION
// =============================================================================

const generateResumeSchema = z.object({
  jobDescription: z.string().min(50, 'Job description must be at least 50 characters'),
  company: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  temperature: z.number().min(0).max(1).default(0.8),
  userPrompt: z.string().optional(),
});

// POST /api/ai/generate-resume - Generate a tailored resume
router.post('/generate-resume', validate(generateResumeSchema), async (req, res) => {
  try {
    const { jobDescription, company, position, temperature, userPrompt } = req.body;

    // Fetch KB context
    const kbContext = await getKBContext();

    if (!kbContext.profile) {
      error(res, 'KB_EMPTY', 'No profile found in knowledge base. Please add your profile first.', 400);
      return;
    }

    if (kbContext.roles.length === 0) {
      error(res, 'KB_EMPTY', 'No work experience found in knowledge base. Please add your roles first.', 400);
      return;
    }

    const result = await generateResume({
      jobDescription,
      company,
      position,
      temperature,
      userPrompt,
      kbContext,
    });

    success(res, result);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not configured')) {
      error(res, 'AI_NOT_CONFIGURED', err.message, 503);
      return;
    }
    serverError(res, err);
  }
});

// =============================================================================
// COVER LETTER GENERATION
// =============================================================================

const generateCoverLetterSchema = z.object({
  jobDescription: z.string().min(50, 'Job description must be at least 50 characters'),
  company: z.string().min(1, 'Company name is required'),
  position: z.string().min(1, 'Position is required'),
  temperature: z.number().min(0).max(1).default(0.8),
  userPrompt: z.string().optional(),
});

// POST /api/ai/generate-cover-letter - Generate a tailored cover letter
router.post('/generate-cover-letter', validate(generateCoverLetterSchema), async (req, res) => {
  try {
    const { jobDescription, company, position, temperature, userPrompt } = req.body;

    const kbContext = await getKBContext();

    if (!kbContext.profile) {
      error(res, 'KB_EMPTY', 'No profile found in knowledge base. Please add your profile first.', 400);
      return;
    }

    const result = await generateCoverLetter({
      jobDescription,
      company,
      position,
      temperature,
      userPrompt,
      kbContext,
    });

    success(res, result);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not configured')) {
      error(res, 'AI_NOT_CONFIGURED', err.message, 503);
      return;
    }
    serverError(res, err);
  }
});

// =============================================================================
// REFINEMENT
// =============================================================================

const refineSchema = z.object({
  currentContent: z.string().min(1, 'Current content is required'),
  chatHistory: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string(),
  })).default([]),
  userMessage: z.string().min(1, 'User message is required'),
  type: z.enum(['resume', 'cover_letter']),
});

// POST /api/ai/refine - Refine a resume or cover letter
router.post('/refine', validate(refineSchema), async (req, res) => {
  try {
    const { currentContent, chatHistory, userMessage, type } = req.body;

    const kbContext = await getKBContext();

    const result = await refineGeneration({
      currentContent,
      chatHistory,
      userMessage,
      type,
      kbContext,
    });

    success(res, result);
  } catch (err) {
    if (err instanceof Error && err.message.includes('not configured')) {
      error(res, 'AI_NOT_CONFIGURED', err.message, 503);
      return;
    }
    serverError(res, err);
  }
});

// =============================================================================
// SUGGESTIONS
// =============================================================================

const suggestionsSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['resume', 'cover_letter']),
});

// POST /api/ai/suggestions - Get improvement suggestions
router.post('/suggestions', validate(suggestionsSchema), async (req, res) => {
  try {
    const { content, type } = req.body;

    const kbContext = await getKBContext();

    const suggestions = await generateSuggestions(content, type, kbContext);

    success(res, { suggestions });
  } catch (err) {
    if (err instanceof Error && err.message.includes('not configured')) {
      error(res, 'AI_NOT_CONFIGURED', err.message, 503);
      return;
    }
    serverError(res, err);
  }
});

export default router;
