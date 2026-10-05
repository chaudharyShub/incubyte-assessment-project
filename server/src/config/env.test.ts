import { describe, expect, it } from 'vitest';
import { loadEnv } from './env.js';

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
