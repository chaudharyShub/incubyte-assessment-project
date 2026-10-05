import { describe, expect, it } from 'vitest';
import { signSessionToken, verifySessionToken } from './session-token.js';

const SECRET = 'a-secret-used-only-in-tests-0123456789';
const USER = { id: 7, email: 'hr@example.com', name: 'HR Manager' };

describe('session token', () => {
  it('gives back the user it was signed for', () => {
    const token = signSessionToken(USER, SECRET);

    expect(verifySessionToken(token, SECRET)).toEqual(USER);
  });

  it('rejects a token signed with a different secret', () => {
    const token = signSessionToken(USER, 'some-other-secret-0123456789-abcdefgh');

    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it('rejects a token whose contents were altered', () => {
    const [header, , signature] = signSessionToken(USER, SECRET).split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: '1', email: 'x@y.z', name: 'x' }),
    ).toString('base64url');

    expect(verifySessionToken(`${header}.${forgedPayload}.${signature}`, SECRET)).toBeNull();
  });

  it('rejects an expired token', () => {
    const token = signSessionToken(USER, SECRET, -1);

    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it('rejects something that is not a token at all', () => {
    expect(verifySessionToken('not-a-token', SECRET)).toBeNull();
  });
});
