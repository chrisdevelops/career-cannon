import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { logChange } from '../lib/change-log.js';
import { requireParam } from '../lib/route-helpers.js';
import { createProjectSchema, updateProjectSchema } from '@career-cannon/shared';

const router = Router();

// GET /api/projects - List all projects
router.get('/', async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { startDate: 'desc' },
    });

    // Parse technologies JSON
    const parsed = projects.map((project) => ({
      ...project,
      technologies: project.technologies ? JSON.parse(project.technologies) : null,
    }));

    success(res, parsed);
  } catch (err) {
    serverError(res, err);
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      notFound(res, 'Project');
      return;
    }
    success(res, {
      ...project,
      technologies: project.technologies ? JSON.parse(project.technologies) : null,
    });
  } catch (err) {
    serverError(res, err);
  }
});

// POST /api/projects - Create new project
router.post('/', validate(createProjectSchema), async (req, res) => {
  try {
    const data = {
      ...req.body,
      technologies: req.body.technologies ? JSON.stringify(req.body.technologies) : null,
    };

    const project = await prisma.project.create({ data });

    await logChange({
      entityType: 'project',
      entityId: project.id,
      action: 'create',
      afterSnapshot: project,
    });

    success(res, {
      ...project,
      technologies: project.technologies ? JSON.parse(project.technologies) : null,
    }, 201);
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', validate(updateProjectSchema), async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Project');
      return;
    }

    const data = {
      ...req.body,
      technologies: req.body.technologies !== undefined
        ? (req.body.technologies ? JSON.stringify(req.body.technologies) : null)
        : undefined,
    };

    const project = await prisma.project.update({
      where: { id },
      data,
    });

    await logChange({
      entityType: 'project',
      entityId: project.id,
      action: 'update',
      beforeSnapshot: existing,
      afterSnapshot: project,
    });

    success(res, {
      ...project,
      technologies: project.technologies ? JSON.parse(project.technologies) : null,
    });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res) => {
  try {
    const id = requireParam(req.params.id, 'id');
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      notFound(res, 'Project');
      return;
    }

    await prisma.project.delete({ where: { id } });

    await logChange({
      entityType: 'project',
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
