import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { createVoiceBlueprintSchema, updateVoiceBlueprintSchema } from '@career-cannon/shared';

const router = Router();

// Helper to parse JSON fields
function parseBlueprint(blueprint: {
  id: string;
  tone: string | null;
  formality: string | null;
  vocabularyNotes: string | null;
  sentenceLength: string | null;
  avoid: string | null;
  samples: string | null;
  customPrompt: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...blueprint,
    avoid: blueprint.avoid ? JSON.parse(blueprint.avoid) : null,
    samples: blueprint.samples ? JSON.parse(blueprint.samples) : null,
  };
}

// GET /api/voice-blueprint - Get the user's voice blueprint (single user app)
router.get('/', async (_req, res) => {
  try {
    const blueprint = await prisma.voiceBlueprint.findFirst();
    if (!blueprint) {
      success(res, null);
      return;
    }
    success(res, parseBlueprint(blueprint));
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/voice-blueprint - Create voice blueprint (only if none exists)
router.post('/', validate(createVoiceBlueprintSchema), async (req, res) => {
  try {
    const existing = await prisma.voiceBlueprint.findFirst();
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Voice blueprint already exists. Use PUT to update.' },
      });
      return;
    }

    const data = {
      ...req.body,
      avoid: req.body.avoid ? JSON.stringify(req.body.avoid) : null,
      samples: req.body.samples ? JSON.stringify(req.body.samples) : null,
    };

    const blueprint = await prisma.voiceBlueprint.create({ data });

    await logChange({
      entityType: 'voiceBlueprint',
      entityId: blueprint.id,
      action: 'create',
      afterSnapshot: blueprint,
    });

    success(res, parseBlueprint(blueprint), 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/voice-blueprint - Update voice blueprint (upsert)
router.put('/', validate(updateVoiceBlueprintSchema), async (req, res) => {
  try {
    const existing = await prisma.voiceBlueprint.findFirst();

    const data = {
      ...req.body,
      avoid: req.body.avoid !== undefined
        ? (req.body.avoid ? JSON.stringify(req.body.avoid) : null)
        : undefined,
      samples: req.body.samples !== undefined
        ? (req.body.samples ? JSON.stringify(req.body.samples) : null)
        : undefined,
    };

    if (!existing) {
      const blueprint = await prisma.voiceBlueprint.create({ data });
      await logChange({
        entityType: 'voiceBlueprint',
        entityId: blueprint.id,
        action: 'create',
        afterSnapshot: blueprint,
      });
      success(res, parseBlueprint(blueprint), 201);
      return;
    }

    const blueprint = await prisma.voiceBlueprint.update({
      where: { id: existing.id },
      data,
    });

    await logChange({
      entityType: 'voiceBlueprint',
      entityId: blueprint.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: blueprint,
    });

    success(res, parseBlueprint(blueprint));
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/voice-blueprint - Delete voice blueprint
router.delete('/', async (_req, res) => {
  try {
    const existing = await prisma.voiceBlueprint.findFirst();
    if (!existing) {
      notFound(res, 'Voice blueprint');
      return;
    }

    await prisma.voiceBlueprint.delete({ where: { id: existing.id } });

    await logChange({
      entityType: 'voiceBlueprint',
      entityId: existing.id,
      action: 'delete',
      beforeSnapshot: existing,
    });

    success(res, { deleted: true });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
