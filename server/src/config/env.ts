import { z } from 'zod';

const schemaName = z
  .string()
  .regex(/^[a-z_][a-z0-9_]*$/, 'must be a lowercase PostgreSQL identifier');

const envSchema = z.object({
  DATABASE_URL: z
    .string({ error: 'is required' })
    .regex(/^postgres(ql)?:\/\//, 'must be a postgres:// connection string'),
  DATABASE_SCHEMA: schemaName.default('public'),
  PORT: z.coerce.number().int().positive().default(3000),
});

export type Env = z.infer<typeof envSchema>;

/** Reads and validates configuration, failing with one message that names every bad variable. */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${problems.join('; ')}`);
  }
  return result.data;
}
