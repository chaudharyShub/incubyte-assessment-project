import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';
import { sslFor, withTransaction } from './pool.js';

function fakePool() {
  const client = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
  const pool = { connect: vi.fn().mockResolvedValue(client) } as unknown as pg.Pool;
  const statements = () => client.query.mock.calls.map(([sql]) => sql);
  return { pool, client, statements };
}

describe('sslFor', () => {
  it('uses TLS for a hosted database', () => {
    expect(sslFor('postgresql://u:p@aws-0-ap-south-1.pooler.supabase.com:5432/postgres')).toEqual({
      rejectUnauthorized: false,
    });
  });

  it('turns TLS off for a database on this machine', () => {
    expect(sslFor('postgresql://u:p@localhost:5432/salaries')).toBe(false);
  });
});

describe('withTransaction', () => {
  it('commits and returns the result when the work succeeds', async () => {
    const { pool, client, statements } = fakePool();

    const result = await withTransaction(pool, async (tx) => {
      await tx.query('INSERT 1');
      return 'done';
    });

    expect(result).toBe('done');
    expect(statements()).toEqual(['BEGIN', 'INSERT 1', 'COMMIT']);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('rolls back and rethrows when the work fails', async () => {
    const { pool, client, statements } = fakePool();
    const failure = new Error('constraint violated');

    await expect(
      withTransaction(pool, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(statements()).toEqual(['BEGIN', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalledOnce();
  });
});
