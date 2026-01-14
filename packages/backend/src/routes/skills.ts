import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { requireParam, getParam } from '../lib/route-helpers.js';
import { createSkillSchema, updateSkillSchema } from '@career-cannon/shared';

const router = Router();

// GET /api/skills - List all skills
router.get('/', async (req, res) => {
  try {
    const category = getParam(req.query.category as string | string[] | undefined);
    const where = category ? { category } : {};

    const skills = await prisma.skill.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Parse evidence JSON
    const parsed = skills.map((skill) => ({
      ...skill,
      evidence: skill.evidence ? JSON.parse(skill.evidence) : null,
    }));

    success(res, parsed);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/skills/:id - Get single skill
router.get('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      notFound(res, 'Skill');
      return;
    }
    success(res, {
      ...skill,
      evidence: skill.evidence ? JSON.parse(skill.evidence) : null,
    });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/skills - Create new skill
router.post('/', validate(createSkillSchema), async (req, res) => {
  try {
    const data = {
      ...req.body,
      evidence: req.body.evidence ? JSON.stringify(req.body.evidence) : null,
    };

    const skill = await prisma.skill.create({ data });

    await logChange({
      entityType: 'skill',
      entityId: skill.id,
      action: 'create',
      afterSnapshot: skill,
    });

    success(res, {
      ...skill,
      evidence: skill.evidence ? JSON.parse(skill.evidence) : null,
    }, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/skills/:id - Update skill
router.put('/:id', validate(updateSkillSchema), async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.skill.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Skill');
      return;
    }

    const data = {
      ...req.body,
      evidence: req.body.evidence !== undefined 
        ? (req.body.evidence ? JSON.stringify(req.body.evidence) : null)
        : undefined,
    };

    const skill = await prisma.skill.update({
      where: { id },
      data,
    });

    await logChange({
      entityType: 'skill',
      entityId: skill.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: skill,
    });

    success(res, {
      ...skill,
      evidence: skill.evidence ? JSON.parse(skill.evidence) : null,
    });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/skills/:id - Delete skill
router.delete('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.skill.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Skill');
      return;
    }

    await prisma.skill.delete({ where: { id } });

    await logChange({
      entityType: 'skill',
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
