import { AppError } from '../../middleware/errors.js';
import type { AuthRepository } from './auth.repository.js';
import { verifyPassword } from './password.js';
import type { SessionUser } from './session-token.js';

// A bcrypt hash of a random string nobody knows. When the email is unknown the
// password is still checked against this, so a wrong email takes as long to
// reject as a wrong password and the response time does not reveal which it was.
const UNMATCHABLE_HASH = '$2b$10$9/.mxVZOTMKoORmuPxVAiOL5CfC9WNSIXS6uCLOpFy7H/2aVyeFMG';

export interface AuthService {
  login(email: string, password: string): Promise<SessionUser>;
}

export function createAuthService(repository: AuthRepository): AuthService {
  return {
    async login(email, password) {
      const user = await repository.findUserByEmail(email);
      const passwordMatches = await verifyPassword(
        password,
        user?.passwordHash ?? UNMATCHABLE_HASH,
      );

      if (!user || !passwordMatches) {
        // One message for both cases, so the response does not confirm which emails exist.
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
      }

      return { id: user.id, email: user.email, name: user.name };
    },
  };
}
