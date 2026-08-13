import { SKIN_VALUES } from '@/lib/skin'
import { source } from '@/lib/source'
import type { StructuredData } from 'fumadocs-core/mdx-plugins'
import { createFromSource } from 'fumadocs-core/search/server'

interface StructuredDataPage {
  data: {
    structuredData?: StructuredData | (() => Promise<StructuredData>)
    load?: () => Promise<{ structuredData: StructuredData }>
    title?: string
    description?: string
    /**
     * Опциональный frontmatter-тег страницы под конкретный скин (решение 7, P7 PLAN.md).
     * Сегодня ни одна страница его не объявляет — весь контент валиден для обоих скинов
     * (переключаемые примеры кода внутри одной страницы, не отдельные URL). Механизм заведён
     * заранее: понадобится, когда появятся skin/framework-эксклюзивные страницы (Этап 2).
     */
    skins?: string[]
  }
  url: string
}

async function resolveStructuredData(page: StructuredDataPage): Promise<StructuredData> {
  if (page.data.structuredData) {
    return typeof page.data.structuredData === 'function' ? await page.data.structuredData() : page.data.structuredData
  }
  if (page.data.load) {
    return (await page.data.load()).structuredData
  }
  throw new Error(`Не удалось найти structuredData для страницы поиска: ${page.url}`)
}

// Статический кэш поискового индекса — сборка предвычисляет полный экспорт один раз
// (`staticGET`), клиент (`src/components/search.tsx`, `staticClient` из
// `fumadocs-core/search/client/orama-static`) фильтрует по query/tag/locale на своей стороне.
// Так и было задумано `revalidate = false`, но клиент раньше был подключён как `type: 'fetch'`
// (ожидает фильтрацию НА сервере) — несовпадение чинится вместе с этой правкой, попутно
// с добавлением `buildIndex` для тегов скина.
export const revalidate = false
export const { staticGET: GET } = createFromSource(source, {
  buildIndex: async (page: unknown) => {
    const typedPage = page as StructuredDataPage
    const structuredData = await resolveStructuredData(typedPage)
    const skinTags = typedPage.data.skins?.filter((value) => (SKIN_VALUES as readonly string[]).includes(value))

    return {
      title: typedPage.data.title ?? typedPage.url,
      description: typedPage.data.description,
      url: typedPage.url,
      id: typedPage.url,
      structuredData,
      ...(skinTags && skinTags.length > 0 ? { tag: skinTags } : {}),
    }
  },
})
