import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { requireParam } from '../lib/route-helpers.js';
import { createEducationSchema, updateEducationSchema } from '@career-cannon/shared';

const router = Router();

// GET /api/education - List all education entries
router.get('/', async (_req, res) => {
  try {
    const education = await prisma.education.findMany({
      orderBy: { endDate: 'desc' },
    });
    success(res, education);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/education/:id - Get single education entry
router.get('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const education = await prisma.education.findUnique({ where: { id } });
    if (!education) {
      notFound(res, 'Education');
      return;
    }
    success(res, education);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/education - Create new education entry
router.post('/', validate(createEducationSchema), async (req, res) => {
  try {
    const education = await prisma.education.create({ data: req.body });

    await logChange({
      entityType: 'education',
      entityId: education.id,
      action: 'create',
      afterSnapshot: education,
    });

    success(res, education, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/education/:id - Update education entry
router.put('/:id', validate(updateEducationSchema), async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.education.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Education');
      return;
    }

    const education = await prisma.education.update({
      where: { id },
      data: req.body,
    });

    await logChange({
      entityType: 'education',
      entityId: education.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: education,
    });

    success(res, education);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/education/:id - Delete education entry
router.delete('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.education.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Education');
      return;
    }

    await prisma.education.delete({ where: { id } });

    await logChange({
      entityType: 'education',
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
