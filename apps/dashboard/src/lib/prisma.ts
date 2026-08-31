import { PrismaClient } from '@/generated/prisma/client'
import { createLazyPrismaAuthClient } from '@letar/auth/server'

/**
 * Стандартный Prisma Client для Better Auth adapter — используется отдельно от ZenStack ORM
 * (`db.ts`), т.к. `prismaAdapter()` несовместим с Kysely-клиентом ZenStack v3.
 */
export const prismaAuth = createLazyPrismaAuthClient(PrismaClient)
