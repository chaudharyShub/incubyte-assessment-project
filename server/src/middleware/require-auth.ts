import type { RequestHandler } from 'express';
import { verifySessionToken, type SessionUser } from '../modules/auth/session-token.js';
import { AppError } from './errors.js';

export const SESSION_COOKIE = 'session';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by `requireAuth`; present on every route behind it. */
    user?: SessionUser;
  }
}

/** Lets the request through only if it carries a valid session cookie. */
export function requireAuth(jwtSecret: string): RequestHandler {
  return (req, _res, next) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE];
    const user = typeof token === 'string' ? verifySessionToken(token, jwtSecret) : null;

    if (!user) {
      next(new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue'));
      return;
    }

    req.user = user;
    next();
  };
}
