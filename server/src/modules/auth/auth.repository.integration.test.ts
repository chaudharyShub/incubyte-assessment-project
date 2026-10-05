import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_META } from '../../test/fakes.js';
import {
  INTEGRATION_USER,
  setUpIntegrationDatabase,
  type IntegrationDatabase,
} from '../../test/integration-db.js';
import { createMetaRepository } from '../meta/meta.repository.js';
import { createAuthRepository } from './auth.repository.js';
import { verifyPassword } from './password.js';

describe('auth and meta repositories (PostgreSQL)', () => {
  let db: IntegrationDatabase;

  beforeAll(async () => {
    db = await setUpIntegrationDatabase();
  });

  afterAll(async () => {
    await db?.close();
  });

  it('finds the seeded user by email in any letter case, with a usable password hash', async () => {
    const user = await createAuthRepository(db.pool).findUserByEmail('HR@Example.com');

    expect(user).toMatchObject({ email: INTEGRATION_USER.email, name: INTEGRATION_USER.name });
    expect(await verifyPassword(INTEGRATION_USER.password, user!.passwordHash)).toBe(true);
  });

  it('returns null for an email nobody has', async () => {
    expect(await createAuthRepository(db.pool).findUserByEmail('nobody@example.com')).toBeNull();
  });

  it('returns reference data in the shape the fakes assume, levels by seniority', async () => {
    const meta = await createMetaRepository(db.pool).getMeta();

    expect(meta.countries).toContainEqual(TEST_META.countries[0]);
    expect(meta.countries.map((c) => c.name)).toEqual(
      [...meta.countries.map((c) => c.name)].sort(),
    );
    expect(meta.departments).toHaveLength(5);
    expect(meta.levels.map((l) => l.name)).toEqual(['Junior', 'Mid', 'Senior', 'Manager']);
  });
});
