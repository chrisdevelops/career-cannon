import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { createProfileSchema, updateProfileSchema } from '@career-cannon/shared';

const router = Router();

// GET /api/profile - Get the user's profile (single user app)
router.get('/', async (_req, res) => {
  try {
    const profile = await prisma.profile.findFirst();
    if (!profile) {
      // Return empty profile structure if none exists
      success(res, null);
      return;
    }
    success(res, profile);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/profile - Create profile (only if none exists)
router.post('/', validate(createProfileSchema), async (req, res) => {
  try {
    const existing = await prisma.profile.findFirst();
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Profile already exists. Use PUT to update.' },
      });
      return;
    }

    const profile = await prisma.profile.create({ data: req.body });

    await logChange({
      entityType: 'profile',
      entityId: profile.id,
      action: 'create',
      afterSnapshot: profile,
    });

    success(res, profile, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/profile - Update profile (upsert)
router.put('/', validate(updateProfileSchema), async (req, res) => {
  try {
    const existing = await prisma.profile.findFirst();

    if (!existing) {
      // Create if doesn't exist
      const profile = await prisma.profile.create({ data: req.body });
      await logChange({
        entityType: 'profile',
        entityId: profile.id,
        action: 'create',
        afterSnapshot: profile,
      });
      success(res, profile, 201);
      return;
    }

    const profile = await prisma.profile.update({
      where: { id: existing.id },
      data: req.body,
    });

    await logChange({
      entityType: 'profile',
      entityId: profile.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: profile,
    });

    success(res, profile);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/profile - Delete profile
router.delete('/', async (_req, res) => {
  try {
    const existing = await prisma.profile.findFirst();
    if (!existing) {
      notFound(res, 'Profile');
      return;
    }

    await prisma.profile.delete({ where: { id: existing.id } });

    await logChange({
      entityType: 'profile',
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
