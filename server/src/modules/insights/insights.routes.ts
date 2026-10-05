import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import type { InsightsRepository } from './insights.repository.js';

const salaryStatsQuerySchema = z.object({
  groupBy: z.enum(['country', 'department', 'level'], {
    error: 'Group by must be country, department or level',
  }),
});

/** How the organisation pays people: figures in INR for active employees. */
export function createInsightsRouter(insights: InsightsRepository): Router {
  const router = Router();

  router.get('/summary', async (_req, res) => {
    res.json(await insights.summary());
  });

  router.get('/salary-stats', async (req, res) => {
    const { groupBy } = validate(salaryStatsQuerySchema, req.query);
    res.json({ groupBy, groups: await insights.salaryStats(groupBy) });
  });

  return router;
}
