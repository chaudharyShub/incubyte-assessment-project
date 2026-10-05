import type pg from 'pg';

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<UserRecord | null>;
}

export function createAuthRepository(pool: pg.Pool): AuthRepository {
  return {
    async findUserByEmail(email) {
      const { rows } = await pool.query<UserRecord>(
        `SELECT id, email, name, password_hash AS "passwordHash"
         FROM users
         WHERE lower(email) = lower($1)`,
        [email],
      );
      return rows[0] ?? null;
    },
  };
}
