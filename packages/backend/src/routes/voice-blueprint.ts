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
  tone?: string | null;
  formality?: string | null;
  sentenceLength?: string | null;
  audience?: string | null;
  pointOfView?: string | null;
  energy?: string | null;
  confidence?: string | null;
  pacing?: string | null;
  structureStyle?: string | null;
  emphasis?: string | null;
  vocabularyNotes?: string | null;
  grammarNotes?: string | null;
  punctuationStyle?: string | null;
  preferredVerbs?: string | null;
  preferredPhrases?: string | null;
  bannedPhrases?: string | null;
  avoid?: string | null;
  samples?: string | null;
  samplePairs?: string | null;
  customPrompt?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...blueprint,
    preferredVerbs: blueprint.preferredVerbs ? JSON.parse(blueprint.preferredVerbs) : null,
    preferredPhrases: blueprint.preferredPhrases ? JSON.parse(blueprint.preferredPhrases) : null,
    bannedPhrases: blueprint.bannedPhrases ? JSON.parse(blueprint.bannedPhrases) : null,
    avoid: blueprint.avoid ? JSON.parse(blueprint.avoid) : null,
    samples: blueprint.samples ? JSON.parse(blueprint.samples) : null,
    samplePairs: blueprint.samplePairs ? JSON.parse(blueprint.samplePairs) : null,
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
      preferredVerbs: req.body.preferredVerbs ? JSON.stringify(req.body.preferredVerbs) : null,
      preferredPhrases: req.body.preferredPhrases ? JSON.stringify(req.body.preferredPhrases) : null,
      bannedPhrases: req.body.bannedPhrases ? JSON.stringify(req.body.bannedPhrases) : null,
      avoid: req.body.avoid ? JSON.stringify(req.body.avoid) : null,
      samples: req.body.samples ? JSON.stringify(req.body.samples) : null,
      samplePairs: req.body.samplePairs ? JSON.stringify(req.body.samplePairs) : null,
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
      preferredVerbs: req.body.preferredVerbs !== undefined
        ? (req.body.preferredVerbs ? JSON.stringify(req.body.preferredVerbs) : null)
        : undefined,
      preferredPhrases: req.body.preferredPhrases !== undefined
        ? (req.body.preferredPhrases ? JSON.stringify(req.body.preferredPhrases) : null)
        : undefined,
      bannedPhrases: req.body.bannedPhrases !== undefined
        ? (req.body.bannedPhrases ? JSON.stringify(req.body.bannedPhrases) : null)
        : undefined,
      avoid: req.body.avoid !== undefined
        ? (req.body.avoid ? JSON.stringify(req.body.avoid) : null)
        : undefined,
      samples: req.body.samples !== undefined
        ? (req.body.samples ? JSON.stringify(req.body.samples) : null)
        : undefined,
      samplePairs: req.body.samplePairs !== undefined
        ? (req.body.samplePairs ? JSON.stringify(req.body.samplePairs) : null)
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
