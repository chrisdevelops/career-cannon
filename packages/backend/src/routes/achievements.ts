import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { requireParam, getParam } from '../lib/route-helpers.js';
import { createAchievementSchema, updateAchievementSchema } from '@career-cannon/shared';

const router = Router();

// GET /api/achievements - List all achievements
router.get('/', async (req, res) => {
  try {
    const roleId = getParam(req.query.roleId as string | string[] | undefined);
    const where = roleId ? { roleId } : {};

    const achievements = await prisma.achievement.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    success(res, achievements);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/achievements/:id - Get single achievement
router.get('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const achievement = await prisma.achievement.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!achievement) {
      notFound(res, 'Achievement');
      return;
    }
    success(res, achievement);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/achievements - Create new achievement
router.post('/', validate(createAchievementSchema), async (req, res) => {
  try {
    // Verify role exists if provided
    if (req.body.roleId) {
      const role = await prisma.role.findUnique({ where: { id: req.body.roleId } });
      if (!role) {
        notFound(res, 'Role');
        return;
      }
    }

    const achievement = await prisma.achievement.create({ data: req.body });

    await logChange({
      entityType: 'achievement',
      entityId: achievement.id,
      action: 'create',
      afterSnapshot: achievement,
    });

    success(res, achievement, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/achievements/:id - Update achievement
router.put('/:id', validate(updateAchievementSchema), async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Achievement');
      return;
    }

    // Verify role exists if updating roleId
    if (req.body.roleId) {
      const role = await prisma.role.findUnique({ where: { id: req.body.roleId } });
      if (!role) {
        notFound(res, 'Role');
        return;
      }
    }

    const achievement = await prisma.achievement.update({
      where: { id },
      data: req.body,
    });

    await logChange({
      entityType: 'achievement',
      entityId: achievement.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: achievement,
    });

    success(res, achievement);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/achievements/:id - Delete achievement
router.delete('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Achievement');
      return;
    }

    await prisma.achievement.delete({ where: { id } });

    await logChange({
      entityType: 'achievement',
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
