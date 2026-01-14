/**
 * Generation Routes
 * 
 * CRUD for generation sessions and versions.
 * Generations group resume/cover letter outputs by job application.
 */

import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { requireParam } from '../lib/route-helpers.js';

const router = Router();

// =============================================================================
// GENERATION CRUD
// =============================================================================

// GET /api/generations - List all generations
router.get('/', async (_req, res) => {
  try {
    const generations = await prisma.generation.findMany({
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1, // Just get latest version count
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Add version count
    const result = generations.map((g) => ({
      ...g,
      versionCount: g.versions.length,
      versions: undefined, // Remove from response
    }));

    success(res, result);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/generations/:id - Get single generation with all versions
router.get('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const generation = await prisma.generation.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'asc' },
        },
      },
    });

    if (!generation) {
      notFound(res, 'Generation');
      return;
    }

    // Parse chatContext JSON
    const result = {
      ...generation,
      versions: generation.versions.map((v) => ({
        ...v,
        chatContext: v.chatContext ? JSON.parse(v.chatContext) : null,
      })),
    };

    success(res, result);
  } catch (err) {
    serverError(res, err);
  }
});

const createGenerationSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  position: z.string().min(1, 'Position is required'),
  jobDescription: z.string().min(1, 'Job description is required'),
  temperature: z.number().min(0).max(1).default(0.8),
});

// POST /api/generations - Create new generation session
router.post('/', validate(createGenerationSchema), async (req, res) => {
  try {
    const generation = await prisma.generation.create({
      data: req.body,
    });

    success(res, generation, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/generations/:id - Delete generation and all versions
router.delete('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.generation.findUnique({ where: { id } });

    if (!existing) {
      notFound(res, 'Generation');
      return;
    }

    await prisma.generation.delete({ where: { id } });

    success(res, { deleted: true });
  } catch (err) {
    serverError(res, err);
  }
});

// =============================================================================
// VERSION CRUD
// =============================================================================

// GET /api/generations/:id/versions - List versions for a generation
router.get('/:id/versions', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    
    const generation = await prisma.generation.findUnique({ where: { id } });
    if (!generation) {
      notFound(res, 'Generation');
      return;
    }

    const versions = await prisma.generationVersion.findMany({
      where: { generationId: id },
      orderBy: { version: 'asc' },
    });

    const result = versions.map((v) => ({
      ...v,
      chatContext: v.chatContext ? JSON.parse(v.chatContext) : null,
    }));

    success(res, result);
  } catch (err) {
    serverError(res, err);
  }
});

const createVersionSchema = z.object({
  type: z.enum(['resume', 'cover_letter']),
  content: z.string().min(1, 'Content is required'),
  chatContext: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

// POST /api/generations/:id/versions - Add new version
router.post('/:id/versions', validate(createVersionSchema), async (req, res) => {
  try {
    const generationId = requireParam(req.params.id, 'id');
    
    const generation = await prisma.generation.findUnique({ where: { id: generationId } });
    if (!generation) {
      notFound(res, 'Generation');
      return;
    }

    // Get next version number
    const lastVersion = await prisma.generationVersion.findFirst({
      where: { generationId, type: req.body.type },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    const version = await prisma.generationVersion.create({
      data: {
        generationId,
        type: req.body.type,
        content: req.body.content,
        chatContext: req.body.chatContext ? JSON.stringify(req.body.chatContext) : null,
        version: nextVersion,
      },
    });

    // Update generation's updatedAt
    await prisma.generation.update({
      where: { id: generationId },
      data: { updatedAt: new Date() },
    });

    success(res, {
      ...version,
      chatContext: version.chatContext ? JSON.parse(version.chatContext) : null,
    }, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/generations/:id/versions/:versionId - Get specific version
router.get('/:id/versions/:versionId', async (req, res) => {
  try {
    const generationId = requireParam(req.params.id, 'id');
    const versionId = requireParam(req.params.versionId, 'versionId');

    const version = await prisma.generationVersion.findFirst({
      where: { id: versionId, generationId },
    });

    if (!version) {
      notFound(res, 'Version');
      return;
    }

    success(res, {
      ...version,
      chatContext: version.chatContext ? JSON.parse(version.chatContext) : null,
    });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
