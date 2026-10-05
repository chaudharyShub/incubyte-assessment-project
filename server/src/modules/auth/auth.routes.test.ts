import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createFakeAuthRepository } from '../../test/fakes.js';
import { createTestApp, TEST_JWT_SECRET } from '../../test/test-app.js';
import { hashPassword } from './password.js';
import { signSessionToken } from './session-token.js';

const CREDENTIALS = { email: 'hr@example.com', password: 'correct-password' };
const USER = { id: 1, email: 'hr@example.com', name: 'HR Manager' };

describe('auth routes', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeAll(async () => {
    const passwordHash = await hashPassword(CREDENTIALS.password);
    app = createTestApp({
      authRepository: createFakeAuthRepository([{ ...USER, passwordHash }]),
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns the user and sets an HttpOnly, SameSite=Strict session cookie', async () => {
      const response = await request(app).post('/api/auth/login').send(CREDENTIALS);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: USER });

      const [cookie] = response.get('Set-Cookie') ?? [];
      expect(cookie).toMatch(/^session=/);
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Max-Age=28800');
    });

    it('accepts the email in any letter case', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ ...CREDENTIALS, email: 'HR@Example.com' });

      expect(response.status).toBe(200);
    });

    it('returns 401 and sets no cookie for a wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ ...CREDENTIALS, password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(response.get('Set-Cookie')).toBeUndefined();
    });

    it('returns 400 naming each invalid field', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Some fields are invalid',
        details: {
          email: ['Enter a valid email address'],
          password: ['Enter your password'],
        },
      });
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when there is no session', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns the signed-in user once logged in', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/login').send(CREDENTIALS);

      const response = await agent.get('/api/auth/me');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user: USER });
    });

    it('returns 401 for a session signed with another secret', async () => {
      const forged = signSessionToken(USER, 'not-the-server-secret-0123456789-abcdef');

      const response = await request(app).get('/api/auth/me').set('Cookie', `session=${forged}`);

      expect(response.status).toBe(401);
    });

    it('returns 401 for an expired session', async () => {
      const expired = signSessionToken(USER, TEST_JWT_SECRET, -1);

      const response = await request(app).get('/api/auth/me').set('Cookie', `session=${expired}`);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('ends the session', async () => {
      const agent = request.agent(app);
      await agent.post('/api/auth/login').send(CREDENTIALS);

      const logout = await agent.post('/api/auth/logout');
      const afterLogout = await agent.get('/api/auth/me');

      expect(logout.status).toBe(204);
      expect(afterLogout.status).toBe(401);
    });
  });
});
