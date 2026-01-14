import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { requireParam, getParam } from '../lib/route-helpers.js';
import { createExperienceItemSchema, updateExperienceItemSchema } from '@career-cannon/shared';

const router = Router();

// GET /api/experience-items - List all experience items
router.get('/', async (req, res) => {
  try {
    const roleId = getParam(req.query.roleId as string | string[] | undefined);
    const where = roleId ? { roleId } : {};

    const items = await prisma.experienceItem.findMany({
      where,
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
    success(res, items);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/experience-items/:id - Get single experience item
router.get('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const item = await prisma.experienceItem.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!item) {
      notFound(res, 'Experience item');
      return;
    }
    success(res, item);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/experience-items - Create new experience item
router.post('/', validate(createExperienceItemSchema), async (req, res) => {
  try {
    // Verify role exists
    const role = await prisma.role.findUnique({ where: { id: req.body.roleId } });
    if (!role) {
      notFound(res, 'Role');
      return;
    }

    const item = await prisma.experienceItem.create({ data: req.body });

    await logChange({
      entityType: 'experienceItem',
      entityId: item.id,
      action: 'create',
      afterSnapshot: item,
    });

    success(res, item, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/experience-items/:id - Update experience item
router.put('/:id', validate(updateExperienceItemSchema), async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.experienceItem.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Experience item');
      return;
    }

    const item = await prisma.experienceItem.update({
      where: { id },
      data: req.body,
    });

    await logChange({
      entityType: 'experienceItem',
      entityId: item.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: item,
    });

    success(res, item);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/experience-items/:id - Delete experience item
router.delete('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.experienceItem.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Experience item');
      return;
    }

    await prisma.experienceItem.delete({ where: { id } });

    await logChange({
      entityType: 'experienceItem',
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
