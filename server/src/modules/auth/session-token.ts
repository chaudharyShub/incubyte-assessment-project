import jwt from 'jsonwebtoken';

export const SESSION_TTL_SECONDS = 8 * 60 * 60;

/** The signed-in user, as carried inside the session token. */
export interface SessionUser {
  id: number;
  email: string;
  name: string;
}

export function signSessionToken(
  user: SessionUser,
  secret: string,
  ttlSeconds = SESSION_TTL_SECONDS,
): string {
  return jwt.sign({ email: user.email, name: user.name }, secret, {
    subject: String(user.id),
    expiresIn: ttlSeconds,
    algorithm: 'HS256',
  });
}

/** Returns the user if the token is genuine and unexpired, otherwise null. */
export function verifySessionToken(token: string, secret: string): SessionUser | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof payload === 'string') return null;

    const id = Number(payload.sub);
    const { email, name } = payload;
    if (!Number.isInteger(id) || typeof email !== 'string' || typeof name !== 'string') {
      return null;
    }
    return { id, email, name };
  } catch {
    return null;
  }
}
