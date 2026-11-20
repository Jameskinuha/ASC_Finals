import { Router } from 'express';
import { Prisma } from '@prisma/client';
import rateLimit from 'express-rate-limit';
import { authenticate, hashPassword, issueToken, verifyPassword } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Too many account attempts. Try again in 15 minutes.' } } });
const credentials = (body) => {
  const input = body && typeof body === 'object' ? body : {};
  return { name: String(input.name || '').trim(), email: String(input.email || '').trim().toLowerCase(), password: String(input.password || '') };
};
const publicUser = ({ id, name, email }) => ({ id, name, email });

router.post('/register', loginLimiter, async (request, response, next) => {
  const { name, email, password } = credentials(request.body);
  if (name.length < 2 || name.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 128) {
    return response.status(422).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Enter a name, valid email, and password between 10 and 128 characters.' } });
  }
  try {
    const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
    return response.status(201).json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return response.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'An account with that email already exists.' } });
    return next(error);
  }
});

router.post('/login', loginLimiter, async (request, response, next) => {
  const { email, password } = credentials(request.body);
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) return response.status(401).json({ error: { code: 'INVALID_LOGIN', message: 'Email or password is incorrect.' } });
    return response.json({ user: publicUser(user), token: issueToken(user) });
  } catch (error) { return next(error); }
});

router.get('/me', authenticate, (request, response) => response.json({ user: request.user }));
router.get('/orders', authenticate, async (request, response, next) => {
  try {
    const orders = await prisma.order.findMany({ where: { userId: request.user.id }, orderBy: { createdAt: 'desc' }, include: { items: { include: { product: { select: { id: true, name: true } } } } } });
    return response.json({ orders: orders.map((order) => ({ ...order, total: Number(order.total), items: order.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice) })) })) });
  } catch (error) { return next(error); }
});

export default router;
