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
import multer from 'multer';
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
import { extractTextFromPDF, isPDFBuffer } from '../services/ai/pdf-extractor.js';

const router = Router();

// Configure multer for memory storage (don't write to disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['text/plain', 'text/markdown', 'application/pdf'];
    const allowedExts = ['.txt', '.md', '.markdown', '.pdf'];
    const ext = file.originalname.toLowerCase().split('.').pop();
    
    if (allowedMimes.includes(file.mimetype) || (ext && allowedExts.includes(`.${ext}`))) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .txt, .md, and .pdf files are allowed.'));
    }
  },
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

// GET /api/ai/status - Check AI provider status
router.get('/status', async (_req, res) => {
  const provider = getOpenAIProvider();
  const configured = await provider.isConfiguredAsync();
  success(res, {
    provider: provider.name,
    configured,
  });
});

// =============================================================================
// RESUME IMPORT
// =============================================================================

const parseResumeSchema = z.object({
  content: z.string().min(50, 'Resume content must be at least 50 characters'),
  format: z.enum(['text', 'markdown']).default('text'),
});

// =============================================================================
// RESUME IMPORT (FILE UPLOAD)
// =============================================================================

// POST /api/ai/parse-resume-file - Parse resume file (txt, md, pdf) into structured data
router.post('/parse-resume-file', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, 'FILE_TOO_LARGE', 'File size exceeds 10MB limit', 400);
      }
      return error(res, 'UPLOAD_ERROR', err.message, 400);
    } else if (err) {
      console.error('Upload error:', err);
      return error(res, 'UPLOAD_ERROR', err.message, 400);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      error(res, 'NO_FILE', 'No file uploaded', 400);
      return;
    }

    const file = req.file;
    let resumeText: string;

    // Detect file type and extract text
    const ext = file.originalname.toLowerCase().split('.').pop();
    
    if (ext === 'pdf' || isPDFBuffer(file.buffer)) {
      // PDF file - extract text
      const pdfResult = await extractTextFromPDF(file.buffer);
      
      // Check if PDF extraction was successful
      if (!pdfResult.text || pdfResult.text.trim().length < 50) {
        error(res, 'PDF_EXTRACTION_FAILED', 
          'Could not extract text from PDF. The file may be scanned (image-based), have complex layouts, or be corrupted. ' +
          'Please try a text-based PDF or use the paste option.', 
          400
        );
        return;
      }

      resumeText = pdfResult.text;
    } else {
      // Text or markdown file
      resumeText = file.buffer.toString('utf-8');
    }

    // Parse the resume
    const { parsed, rawExtraction } = await parseResume(resumeText);

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

// POST /api/ai/parse-resume - Parse resume text into structured data (paste method)
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
