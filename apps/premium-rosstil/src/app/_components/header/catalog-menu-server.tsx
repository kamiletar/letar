import { getEnhancedPrisma } from '@/lib/db'
import { CatalogMenu } from './catalog-menu'

/**
 * Server Component для загрузки категорий и рендеринга CatalogMenu.
 * Загружает категории из БД и передаёт их в клиентский компонент.
 */
export async function CatalogMenuServer() {
  const db = getEnhancedPrisma()

  // Загружаем категории для меню
  const categories = await db.category.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true, slug: true },
  })

  return <CatalogMenu categories={categories} />
}
