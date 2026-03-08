// Prisma client singleton.
// In development, tsx --watch re-evaluates modules on every file change.
// Without the global guard, each hot-reload creates a new PrismaClient and exhausts DB connections.

import { PrismaClient } from '@prisma/client';

// Extend globalThis so TypeScript accepts the prisma property
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Reuse the existing client in dev; always create a fresh one in production
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
