import type { AuthRepository, UserRecord } from '../modules/auth/auth.repository.js';

/** An AuthRepository backed by an array, for tests that must not touch a database. */
export function createFakeAuthRepository(users: UserRecord[] = []): AuthRepository {
  return {
    async findUserByEmail(email) {
      return users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
    },
  };
}
