import 'dotenv/config';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

if (process.env.NODE_ENV === 'production' && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32)) {
  throw new Error('Set AUTH_SECRET to at least 32 characters in the production environment.');
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0');
const server = createApp().listen(port, host, () => console.log(`ShopSmart API running at http://${host}:${port}`));

async function shutdown(signal) {
  console.log(`\n${signal} received. Closing ShopSmart API.`);
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
