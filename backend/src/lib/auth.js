import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be configured in production.');
  return secret || 'local-development-only-secret-change-me';
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [salt, expectedHex] = String(encoded).split(':');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function issueToken(user) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, name: user.name, email: user.email, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS })).toString('base64url');
  const signature = createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function authenticate(request, response, next) {
  const token = request.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return response.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Sign in to continue.' } });
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return response.status(401).json({ error: { code: 'INVALID_SESSION', message: 'Sign in again to continue.' } });
  const expected = createHmac('sha256', authSecret()).update(payload).digest();
  const received = Buffer.from(signature, 'base64url');
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return response.status(401).json({ error: { code: 'INVALID_SESSION', message: 'Sign in again to continue.' } });
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!Number.isInteger(user.sub) || user.exp <= Math.floor(Date.now() / 1000)) throw new Error('expired');
    request.user = { id: user.sub, name: user.name, email: user.email };
  } catch {
    return response.status(401).json({ error: { code: 'INVALID_SESSION', message: 'Sign in again to continue.' } });
  }
  return next();
}
