import { z } from 'zod';

type EnvSource = Record<string, string | undefined>;

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

const seedEnvSchema = z.object({
  SEED_HR_EMAIL: z.email({ error: 'must be an email address' }),
  SEED_HR_PASSWORD: z.string({ error: 'is required' }).min(8, 'must be at least 8 characters long'),
  SEED_HR_NAME: z.string().min(1).default('HR Manager'),
});

const authEnvSchema = z.object({
  JWT_SECRET: z.string({ error: 'is required' }).min(32, 'must be at least 32 characters long'),
});

export type Env = z.infer<typeof envSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
export type SeedEnv = z.infer<typeof seedEnvSchema>;

function parse<T>(schema: z.ZodType<T>, source: EnvSource): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join('.')} ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${problems.join('; ')}`);
  }
  return result.data;
}

/** Reads and validates configuration, failing with one message that names every bad variable. */
export function loadEnv(source: EnvSource = process.env): Env {
  return parse(envSchema, source);
}

/** The HR Manager account the seed script creates. Only the seed script needs these. */
export function loadSeedEnv(source: EnvSource = process.env): SeedEnv {
  return parse(seedEnvSchema, source);
}

/** The secret that signs session cookies. Only the API server needs it. */
export function loadAuthEnv(source: EnvSource = process.env): AuthEnv {
  return parse(authEnvSchema, source);
}
