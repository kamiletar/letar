import { isProductionDomain } from '@letar/seo'
import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://archetest.letar.best'

/**
 * robots.txt. До этого файла не было вовсе — краулеры обходили и приватные разделы.
 *
 * Закрыты: кабинет психолога и настройки (за авторизацией, в выдаче им делать
 * нечего), API и dev-превью. Открыты публичные страницы: главная, экспресс,
 * методология для психологов, политика приватности.
 *
 * На staging/dev индексация закрыта целиком (§33 PLAN-INFRA.md) — гейт по `NODE_ENV`
 * был бы ложным: `next build` выставляет `production` и на staging тоже (см.
 * [env-files](/.claude/rules/env-files.md)). Правильный гейт — сверка домена с боевым
 * через `@letar/seo`.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDomain(PRODUCTION_URL)) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cabinet', '/en/cabinet', '/settings', '/en/settings', '/api/', '/dev/', '/en/dev/'],
    },
    sitemap: `${PRODUCTION_URL}/sitemap.xml`,
  }
}
