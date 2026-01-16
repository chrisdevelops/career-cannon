import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { getDefaultPrompts, type PromptKey } from '../services/ai/prompts.js';

const router = Router();

const PROMPT_META: Record<PromptKey, { title: string; description: string }> = {
  'resume-parser': {
    title: 'Resume Import / Parsing',
    description: 'System prompt used to extract structured data from raw resume text.',
  },
  'resume-generator': {
    title: 'Resume Generation',
    description: 'Base system prompt for generating tailored resumes.',
  },
  'cover-letter-generator': {
    title: 'Cover Letter Generation',
    description: 'System prompt for generating personalized cover letters.',
  },
  refinement: {
    title: 'Refinement',
    description: 'System prompt for iterative chat-based refinement.',
  },
  suggestions: {
    title: 'Suggestions',
    description: 'Prompt used to generate improvement suggestions.',
  },
};

const updatePromptSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

// GET /api/prompts - list prompts with overrides
router.get('/', async (_req, res) => {
  try {
    const defaults = getDefaultPrompts();
    const overrides = await prisma.promptOverride.findMany();
    const overrideMap = new Map(overrides.map((o) => [o.key, o]));

    const result = (Object.keys(defaults) as PromptKey[]).map((key) => {
      const override = overrideMap.get(key);
      const meta = PROMPT_META[key];
      return {
        key,
        title: meta.title,
        description: meta.description,
        defaultText: defaults[key],
        overrideText: override?.content ?? null,
        effectiveText: override?.content ?? defaults[key],
        updatedAt: override?.updatedAt ?? null,
      };
    });

    success(res, result);
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /api/prompts/:key - set override
router.patch('/:key', validate(updatePromptSchema), async (req, res) => {
  try {
    const key = req.params.key as PromptKey;
    const defaults = getDefaultPrompts();

    if (!defaults[key]) {
      notFound(res, 'Prompt');
      return;
    }

    const override = await prisma.promptOverride.upsert({
      where: { key },
      update: { content: req.body.content },
      create: { key, content: req.body.content },
    });

    success(res, {
      key,
      overrideText: override.content,
      effectiveText: override.content,
      updatedAt: override.updatedAt,
    });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/prompts/:key/reset - remove override
router.post('/:key/reset', async (req, res) => {
  try {
    const key = req.params.key as PromptKey;
    const defaults = getDefaultPrompts();

    if (!defaults[key]) {
      notFound(res, 'Prompt');
      return;
    }

    await prisma.promptOverride.deleteMany({ where: { key } });

    success(res, {
      key,
      overrideText: null,
      effectiveText: defaults[key],
    });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
