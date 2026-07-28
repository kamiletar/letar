import type { MetadataRoute } from 'next'

/**
 * robots.txt. До этого файла не было вовсе — краулеры обходили и приватные разделы.
 *
 * Закрыты: кабинет психолога и настройки (за авторизацией, в выдаче им делать
 * нечего), API и dev-превью. Открыты публичные страницы: главная, экспресс,
 * методология для психологов, политика приватности.
 *
 * ⚠️ Здесь НЕТ разделения «прод/не прод». Гейт по `NODE_ENV` был бы ложным:
 * `next build` выставляет `production` и на staging тоже (см.
 * [env-files](/.claude/rules/env-files.md)). Правильный гейт — сверка домена
 * с явным списком продакшен-доменов; он не сделан, потому что домен задаётся
 * только через `NEXT_PUBLIC_APP_URL` в незакоммиченном окружении.
 * Задача заведена в PLAN.md (техдолг «staging индексируется наравне с продом»).
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/cabinet', '/en/cabinet', '/settings', '/en/settings', '/api/', '/dev/', '/en/dev/'],
    },
    ...(baseUrl ? { sitemap: `${baseUrl}/sitemap.xml` } : {}),
  }
}
