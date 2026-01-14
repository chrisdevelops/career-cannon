import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { requireParam } from '../lib/route-helpers.js';
import { createRoleSchema, updateRoleSchema } from '@career-cannon/shared';

const router = Router();

// GET /api/roles - List all roles with experience items and achievements
router.get('/', async (_req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        experienceItems: true,
        achievements: true,
      },
      orderBy: { startDate: 'desc' },
    });
    success(res, roles);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/roles/:id - Get single role with related items
router.get('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        experienceItems: true,
        achievements: true,
      },
    });
    if (!role) {
      notFound(res, 'Role');
      return;
    }
    success(res, role);
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/roles - Create new role
router.post('/', validate(createRoleSchema), async (req, res) => {
  try {
    const role = await prisma.role.create({ data: req.body });

    await logChange({
      entityType: 'role',
      entityId: role.id,
      action: 'create',
      afterSnapshot: role,
    });

    success(res, role, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/roles/:id - Update role
router.put('/:id', validate(updateRoleSchema), async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.role.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Role');
      return;
    }

    const role = await prisma.role.update({
      where: { id },
      data: req.body,
    });

    await logChange({
      entityType: 'role',
      entityId: role.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: role,
    });

    success(res, role);
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/roles/:id - Delete role (cascades to experience items)
router.delete('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.role.findUnique({
      where: { id },
      include: { experienceItems: true, achievements: true },
    });
    if (!existing) {
      notFound(res, 'Role');
      return;
    }

    await prisma.role.delete({ where: { id } });

    await logChange({
      entityType: 'role',
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
