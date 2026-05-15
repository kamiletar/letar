'use server'

import type { Gender } from '@/generated/prisma'
import { getEnhancedPrisma } from '@/lib/db'

export async function getSizeChart(gender: Gender) {
  const db = getEnhancedPrisma()

  const sizes = await db.productSize.findMany({
    where: { gender },
    orderBy: { sortOrder: 'asc' },
  })

  return sizes
}
