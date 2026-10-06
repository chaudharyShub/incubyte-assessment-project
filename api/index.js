// Vercel serverless entry: every /api request is handled by the Express app.
// It imports the compiled server, which the build command produces before this is bundled.
import { createAppFromEnv } from '../server/dist/bootstrap.js';

export default createAppFromEnv();
