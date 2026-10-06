import { createAppFromEnv } from './bootstrap.js';
import { loadEnv } from './config/env.js';

const { PORT } = loadEnv();

createAppFromEnv().listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
