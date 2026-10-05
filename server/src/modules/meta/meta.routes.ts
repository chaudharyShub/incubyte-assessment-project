import { Router } from 'express';
import type { MetaRepository } from './meta.repository.js';

/** The choices behind the UI's filters and forms: countries, departments and levels. */
export function createMetaRouter(meta: MetaRepository): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await meta.getMeta());
  });

  return router;
}
