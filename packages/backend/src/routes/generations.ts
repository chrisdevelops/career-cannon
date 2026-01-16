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
          select: { type: true, favorite: true },
        },
        drafts: {
          select: { type: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = generations.map((g) => {
      const versionTypes = new Set<string>();
      g.versions.forEach((v) => versionTypes.add(v.type));
      g.drafts.forEach((d) => versionTypes.add(d.type));
      const hasFavorite = g.versions.some((v) => v.favorite);

      return {
        ...g,
        versionCount: g.versions.length,
        versionTypes: Array.from(versionTypes),
        hasFavorite,
        versions: undefined,
        drafts: undefined,
      };
    });

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
        drafts: {
          include: {
            baseVersion: true,
          },
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
        isDraft: false,
        baseVersionId: null,
      })),
      drafts: generation.drafts.map((d) => ({
        id: d.id,
        generationId: d.generationId,
        type: d.type,
        content: d.content,
        chatContext: d.chatContext ? JSON.parse(d.chatContext) : null,
        version: d.baseVersion.version,
        name: d.baseVersion.name,
        favorite: d.baseVersion.favorite,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        isDraft: true,
        baseVersionId: d.baseVersionId,
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

// GET /api/generations/:id/versions - List versions and drafts for a generation
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

    const drafts = await prisma.generationDraft.findMany({
      where: { generationId: id },
      include: { baseVersion: true },
      orderBy: { updatedAt: 'desc' },
    });

    const result = [
      ...versions.map((v) => ({
        ...v,
        chatContext: v.chatContext ? JSON.parse(v.chatContext) : null,
        isDraft: false,
        baseVersionId: null,
      })),
      ...drafts.map((d) => ({
        id: d.id,
        generationId: d.generationId,
        type: d.type,
        content: d.content,
        chatContext: d.chatContext ? JSON.parse(d.chatContext) : null,
        version: d.baseVersion.version,
        name: d.baseVersion.name,
        favorite: d.baseVersion.favorite,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        isDraft: true,
        baseVersionId: d.baseVersionId,
      })),
    ];

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

const updateVersionSchema = z.object({
  name: z.string().min(1).max(80).nullable().optional(),
  favorite: z.boolean().optional(),
});

const draftSchema = z.object({
  baseVersionId: z.string().min(1, 'Base version is required'),
  content: z.string().min(1, 'Content is required'),
  chatContext: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
});

const commitDraftSchema = z.object({
  draftId: z.string().min(1, 'Draft ID is required'),
});

// POST /api/generations/:id/versions - Add new version (explicit save)
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
      isDraft: false,
      baseVersionId: null,
    }, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PATCH /api/generations/:id/versions/:versionId - Update version metadata
router.patch('/:id/versions/:versionId', validate(updateVersionSchema), async (req, res) => {
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

    const updated = await prisma.generationVersion.update({
      where: { id: versionId },
      data: {
        name: req.body.name,
        favorite: req.body.favorite,
      },
    });

    success(res, {
      ...updated,
      chatContext: updated.chatContext ? JSON.parse(updated.chatContext) : null,
      isDraft: false,
      baseVersionId: null,
    });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/generations/:id/drafts - Create or update draft for a base version
router.post('/:id/drafts', validate(draftSchema), async (req, res) => {
  try {
    const generationId = requireParam(req.params.id, 'id');
    const baseVersion = await prisma.generationVersion.findFirst({
      where: { id: req.body.baseVersionId, generationId },
    });

    if (!baseVersion) {
      notFound(res, 'Base version');
      return;
    }

    const draft = await prisma.generationDraft.upsert({
      where: { baseVersionId: req.body.baseVersionId },
      create: {
        generationId,
        baseVersionId: req.body.baseVersionId,
        type: baseVersion.type,
        content: req.body.content,
        chatContext: req.body.chatContext ? JSON.stringify(req.body.chatContext) : null,
      },
      update: {
        content: req.body.content,
        chatContext: req.body.chatContext ? JSON.stringify(req.body.chatContext) : null,
      },
    });

    success(res, {
      id: draft.id,
      generationId: draft.generationId,
      type: draft.type,
      content: draft.content,
      chatContext: draft.chatContext ? JSON.parse(draft.chatContext) : null,
      version: baseVersion.version,
      name: baseVersion.name,
      favorite: baseVersion.favorite,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      isDraft: true,
      baseVersionId: draft.baseVersionId,
    });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/generations/:id/drafts/:draftId - Discard a draft
router.delete('/:id/drafts/:draftId', async (req, res) => {
  try {
    const generationId = requireParam(req.params.id, 'id');
    const draftId = requireParam(req.params.draftId, 'draftId');

    const draft = await prisma.generationDraft.findFirst({
      where: { id: draftId, generationId },
    });

    if (!draft) {
      notFound(res, 'Draft');
      return;
    }

    await prisma.generationDraft.delete({ where: { id: draftId } });
    success(res, { deleted: true });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/generations/:id/versions/commit - Commit a draft to a new version
router.post('/:id/versions/commit', validate(commitDraftSchema), async (req, res) => {
  try {
    const generationId = requireParam(req.params.id, 'id');
    const draft = await prisma.generationDraft.findFirst({
      where: { id: req.body.draftId, generationId },
      include: { baseVersion: true },
    });

    if (!draft) {
      notFound(res, 'Draft');
      return;
    }

    const lastVersion = await prisma.generationVersion.findFirst({
      where: { generationId, type: draft.type },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    const version = await prisma.generationVersion.create({
      data: {
        generationId,
        type: draft.type,
        content: draft.content,
        chatContext: draft.chatContext,
        version: nextVersion,
      },
    });

    await prisma.generationDraft.delete({ where: { id: draft.id } });

    await prisma.generation.update({
      where: { id: generationId },
      data: { updatedAt: new Date() },
    });

    success(res, {
      ...version,
      chatContext: version.chatContext ? JSON.parse(version.chatContext) : null,
      isDraft: false,
      baseVersionId: null,
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
      isDraft: false,
      baseVersionId: null,
    });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
