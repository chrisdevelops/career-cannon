import { Router } from 'express';
import { z } from 'zod';
import { success, serverError } from '../lib/api-response.js';
import { validate } from '../middleware/validate.js';
import {
  clearApiKey,
  getApiKey,
  getEffectiveApiKey,
  maskApiKey,
  setApiKey,
  type ApiProvider,
} from '../services/settings/api-keys.js';

const router = Router();

const updateApiKeySchema = z.object({
  provider: z.enum(['openai']),
  value: z.string().min(10, 'API key is required'),
});

// GET /api/settings/api-keys
router.get('/api-keys', async (_req, res) => {
  try {
    const stored = await getApiKey('openai');
    const effective = await getEffectiveApiKey('openai');
    success(res, {
      provider: 'openai',
      hasKey: !!effective,
      stored: stored ? maskApiKey(stored) : null,
      source: stored ? 'database' : effective ? 'env' : 'none',
    });
  } catch (err) {
    serverError(res, err);
  }
});

// PUT /api/settings/api-keys
router.put('/api-keys', validate(updateApiKeySchema), async (req, res) => {
  try {
    const { provider, value } = req.body as { provider: ApiProvider; value: string };
    await setApiKey(provider, value);
    success(res, {
      provider,
      stored: maskApiKey(value),
      source: 'database',
    });
  } catch (err) {
    serverError(res, err);
  }
});

// DELETE /api/settings/api-keys/:provider
router.delete('/api-keys/:provider', async (req, res) => {
  try {
    const provider = req.params.provider as ApiProvider;
    if (provider !== 'openai') {
      success(res, { deleted: false });
      return;
    }
    await clearApiKey(provider);
    success(res, { deleted: true });
  } catch (err) {
    serverError(res, err);
  }
});

export default router;
