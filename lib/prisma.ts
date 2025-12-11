import { PrismaClient } from '@prisma/client';

/**
 * Singleton factory for the Prisma Client.
 * Needed to prevent multiple instances during Next.js hot-reloading.
 */
const prismaClientSingleton = () => {
    // Log queries in debug mode only, otherwise just errors/warns
    const isDebug = process.env.LOG_LEVEL === 'debug';
    return new PrismaClient({
        log: isDebug ? ['query', 'error', 'warn'] : ['error', 'warn'],
    });
};

declare global {
    var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

/**
 * Global Prisma instance.
 * Reuses the existing instance in development to avoid exhausting database connections.
 */
const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}
