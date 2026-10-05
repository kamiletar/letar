import { getEnhancedPrisma } from './db'

/** Рубрики, которые создаются владельцу при первом входе. Потом их можно менять в настройках */
export const DEFAULT_RUBRICS = [
  { slug: 'web-architect', name: 'Веб-архитектор' },
  { slug: 'poet', name: 'Поэт' },
  { slug: 'audiophile', name: 'Аудиофил' },
  { slug: 'cinephile', name: 'Синефил' },
  { slug: 'otaku', name: 'Отаку' },
] as const

/** Заводит стартовые рубрики, только если у владельца их ещё нет */
export async function ensureDefaultRubrics(ownerId: string) {
  const db = getEnhancedPrisma({ id: ownerId })
  const count = await db.rubric.count({ where: { ownerId } })
  if (count > 0) {
    return
  }
  await db.rubric.createMany({
    data: DEFAULT_RUBRICS.map((rubric, sort) => ({ ...rubric, ownerId, sort })),
  })
}
