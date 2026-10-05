import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('does not store the password itself', async () => {
    const hash = await hashPassword('correct horse');

    expect(hash).not.toContain('correct horse');
  });

  it('accepts the password that was hashed', async () => {
    const hash = await hashPassword('correct horse');

    expect(await verifyPassword('correct horse', hash)).toBe(true);
  });

  it('rejects a different password', async () => {
    const hash = await hashPassword('correct horse');

    expect(await verifyPassword('wrong horse', hash)).toBe(false);
  });

  it('salts each hash, so the same password hashes differently every time', async () => {
    expect(await hashPassword('correct horse')).not.toBe(await hashPassword('correct horse'));
  });
});
