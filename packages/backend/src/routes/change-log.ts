import { Router } from 'express';
import { z } from 'zod';
import { success, notFound, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import { getChangeHistory, undoChange } from '../lib/change-log.js';
import { getParam } from '../lib/route-helpers.js';
import type { EntityType } from '@career-cannon/shared';

const router = Router();

// GET /api/change-log - Get change history
router.get('/', async (req, res) => {
  try {
    const entityType = getParam(req.query.entityType as string | string[] | undefined) as EntityType | undefined;
    const entityId = getParam(req.query.entityId as string | string[] | undefined);
    const limitStr = getParam(req.query.limit as string | string[] | undefined);
    const limit = limitStr ? Math.min(parseInt(limitStr, 10) || 50, 100) : 50;

    const history = await getChangeHistory(entityType, entityId, limit);
    success(res, history);
  } catch (err) {
    serverError(res, err);
  }
});

const undoSchema = z.object({
  changeLogId: z.string().min(1, 'Change log ID is required'),
});

// POST /api/change-log/undo - Undo a specific change
router.post('/undo', validate(undoSchema), async (req, res) => {
  try {
    const result = await undoChange(req.body.changeLogId);
    if (!result.success) {
      notFound(res, result.message);
      return;
    }
    success(res, result);
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
