import { describe, expect, it } from 'vitest';
import { loadAuthEnv, loadEnv, loadSeedEnv } from './env.js';

const DATABASE_URL = 'postgresql://user:secret@db.example.com:5432/postgres';

describe('loadEnv', () => {
  it('applies defaults when only the database URL is given', () => {
    expect(loadEnv({ DATABASE_URL })).toEqual({
      DATABASE_URL,
      DATABASE_SCHEMA: 'public',
      PORT: 3000,
    });
  });

  it('reads the port as a number', () => {
    expect(loadEnv({ DATABASE_URL, PORT: '8080' }).PORT).toBe(8080);
  });

  it('fails when the database URL is missing', () => {
    expect(() => loadEnv({})).toThrow('DATABASE_URL is required');
  });

  it('fails when the database URL is not a PostgreSQL connection string', () => {
    expect(() => loadEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      'DATABASE_URL must be a postgres:// connection string',
    );
  });

  it('rejects a schema name that is not a plain identifier', () => {
    expect(() => loadEnv({ DATABASE_URL, DATABASE_SCHEMA: 'public; DROP TABLE x' })).toThrow(
      'DATABASE_SCHEMA must be a lowercase PostgreSQL identifier',
    );
  });

  it('names every invalid variable in one error', () => {
    expect(() => loadEnv({ PORT: 'abc' })).toThrow(/DATABASE_URL.*PORT/);
  });
});

describe('loadSeedEnv', () => {
  const SEED = { SEED_HR_EMAIL: 'hr@example.com', SEED_HR_PASSWORD: 'long-enough' };

  it('reads the HR Manager account and defaults the name', () => {
    expect(loadSeedEnv(SEED)).toEqual({ ...SEED, SEED_HR_NAME: 'HR Manager' });
  });

  it('fails when the email is not an email address', () => {
    expect(() => loadSeedEnv({ ...SEED, SEED_HR_EMAIL: 'hr' })).toThrow(
      'SEED_HR_EMAIL must be an email address',
    );
  });

  it('fails when the password is missing', () => {
    expect(() => loadSeedEnv({ SEED_HR_EMAIL: SEED.SEED_HR_EMAIL })).toThrow(
      'SEED_HR_PASSWORD is required',
    );
  });

  it('fails when the password is shorter than 8 characters', () => {
    expect(() => loadSeedEnv({ ...SEED, SEED_HR_PASSWORD: 'short' })).toThrow(
      'SEED_HR_PASSWORD must be at least 8 characters long',
    );
  });
});

describe('loadAuthEnv', () => {
  it('reads the session secret', () => {
    const JWT_SECRET = '0123456789abcdef0123456789abcdef';

    expect(loadAuthEnv({ JWT_SECRET })).toEqual({ JWT_SECRET });
  });

  it('fails when the secret is missing', () => {
    expect(() => loadAuthEnv({})).toThrow('JWT_SECRET is required');
  });

  it('fails when the secret is too short to be safe', () => {
    expect(() => loadAuthEnv({ JWT_SECRET: 'short' })).toThrow(
      'JWT_SECRET must be at least 32 characters long',
    );
  });
});
