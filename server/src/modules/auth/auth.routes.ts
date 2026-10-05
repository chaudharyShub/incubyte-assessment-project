import { Router, type CookieOptions } from 'express';
import { z } from 'zod';
import { requireAuth, SESSION_COOKIE } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import type { AuthService } from './auth.service.js';
import { SESSION_TTL_SECONDS, signSessionToken } from './session-token.js';

export interface SessionConfig {
  jwtSecret: string;
  /** Send the cookie over HTTPS only. Off for local development on http://localhost. */
  secureCookies: boolean;
}

const loginSchema = z.object({
  email: z.email({ error: 'Enter a valid email address' }),
  password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password'),
});

export function createAuthRouter(auth: AuthService, session: SessionConfig): Router {
  const router = Router();

  // HttpOnly keeps the token away from page scripts; SameSite=Strict stops other
  // sites from making requests that carry it.
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: session.secureCookies,
    path: '/',
  };

  router.post('/login', async (req, res) => {
    const { email, password } = validate(loginSchema, req.body);
    const user = await auth.login(email, password);

    res.cookie(SESSION_COOKIE, signSessionToken(user, session.jwtSecret), {
      ...cookieOptions,
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
    res.json({ user });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth(session.jwtSecret), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
