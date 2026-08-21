/**
 * Скрипт извлечения социальных ссылок поэтов из сырых Telegram-чанков.
 *
 * Алгоритм:
 * 1. Читает raw chunk JSON файлы (Telegram export)
 * 2. Находит сообщения с составами команд (содержат ссылки + имена)
 * 3. Парсит пары "Имя: ссылки" из текста
 * 4. Матчит к Player записям в БД
 * 5. Записывает socialLinks JSON
 *
 * Использование:
 *   bun scripts/migrate/extract-social-links.ts           # dry-run
 *   bun scripts/migrate/extract-social-links.ts --apply    # записать в БД
 */

import { config } from 'dotenv'
import * as fs from 'fs'
import { join } from 'node:path'
import * as path from 'path'
import { Pool } from 'pg'

config({ path: join(import.meta.dirname, '../../.env.local') })
config({ path: join(import.meta.dirname, '../../.env') })

// ⚠️ Пароль в DATABASE_URL генерируется через `openssl rand -base64 32` (см. security.md) —
// алфавит base64 содержит `/` и `+`. Необработанный `/` перед `@` ломает разбор строки через
// `new URL()` внутри pg-connection-string. Разбираем строку вручную и передаём поля отдельно.
function parsePostgresUrl(url: string) {
  const match = url.match(/^postgres(?:ql)?:\/\/([^:]+):([\s\S]+)@([^@/:]+):(\d+)\/([^?]+)/)
  if (!match) {
    throw new Error('DATABASE_URL: не удалось распарсить (ожидается postgresql://user:password@host:port/db)')
  }
  const [, user, password, host, port, database] = match
  return { user: decodeURIComponent(user), password: decodeURIComponent(password), host, port: Number(port), database }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const pool = new Pool(parsePostgresUrl(process.env.DATABASE_URL))
const APPLY = process.argv.includes('--apply')

interface SocialLink {
  platform: 'telegram' | 'vk' | 'stihi.ru' | 'youtube' | 'instagram' | 'website' | 'twitter' | 'tiktok'
  url: string
}

interface PoetLinks {
  name: string
  links: SocialLink[]
}

/** Определяем платформу по URL */
function classifyUrl(url: string): SocialLink['platform'] {
  if (url.includes('t.me/')) {
    return 'telegram'
  }
  if (url.includes('vk.com/')) {
    return 'vk'
  }
  if (url.includes('stihi.ru/')) {
    return 'stihi.ru'
  }
  if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
    return 'youtube'
  }
  if (url.includes('instagram.com/')) {
    return 'instagram'
  }
  if (url.includes('twitter.com/') || url.includes('x.com/')) {
    return 'twitter'
  }
  if (url.includes('tiktok.com/')) {
    return 'tiktok'
  }
  return 'website'
}

/** Проверяем, что URL — профиль/канал, а не конкретный пост или альбом */
function isProfileUrl(url: string): boolean {
  if (/\/\d+$/.test(url)) {
    return false
  } // t.me/channel/123 — пост
  if (url.includes('/wall-')) {
    return false
  }
  if (url.includes('/album-')) {
    return false
  }
  if (url.includes('/topic-')) {
    return false
  }
  if (url.includes('/event')) {
    return false
  }
  if (url.includes('/audios')) {
    return false
  }
  if (url.includes('?w=wall')) {
    return false
  }
  if (url.includes('/club')) {
    return false
  }
  if (url.startsWith('https://m.vk.com/club')) {
    return false
  }
  if (url.includes('stihi.ru/') && !url.includes('/avtor/')) {
    return false
  }
  if (url.includes('t.me/+')) {
    return false
  }
  return true
}

/** Нормализуем URL */
function normalizeUrl(url: string): string {
  return url
    .replace(/\\/g, '')
    .replace(/[)）\]>]+$/, '') // убираем скобки в конце
    .replace(/[,;.\s]+$/, '')
    .replace(/^https?:\/\/m\./, 'https://')
    .trim()
}

/** Регулярка для поиска URL */
const URL_DOMAINS =
  't\\.me|vk\\.com|stihi\\.ru|youtube\\.com|youtu\\.be|instagram\\.com|twitter\\.com|x\\.com|tiktok\\.com'
const urlRe = new RegExp(`https?:\\/\\/(${URL_DOMAINS})\\/[^\\s]+`, 'g')

/** Очищаем имя от суффиксов/префиксов роли и пунктуации */
function cleanPoetName(raw: string): string {
  return raw
    .replace(/^(Играющий тренер|Тренер|Капитан)\s*[-–—:]\s*/i, '')
    .replace(/\s*\(.*?\)\s*/g, '') // убираем скобки с ролью: "Зарина Фок (играющий тренер)"
    .replace(/[:：]+$/, '') // убираем двоеточия в конце
    .replace(/\s+тренер\s+играющий$/i, '') // "Витя Горелый тренер играющий"
    .trim()
}

/** Слова-маркеры, при которых строка НЕ является именем поэта */
const NOT_NAME_PATTERNS =
  /^(Вот|Мы |На |Важное|Появилась|Новости|Ещё|Еще|Два |Три |Стадион|Состав|Участники|Игроки|Подписывайтесь|Подпишись|Подпишемся|Ссылки|Ссылка|Исходный|Событие|Бронь|Автор |Трансляция|Фото|Подробн|Приём|ТГК |part |Против$|@)/i

/** Извлекаем пары имя+ссылки из текста сообщения */
function extractPoetLinks(text: string): PoetLinks[] {
  const lines = text.split('\n')
  const results: PoetLinks[] = []

  let currentName: string | null = null
  let currentLinks: SocialLink[] = []

  const flushCurrent = () => {
    if (currentName && currentLinks.length > 0) {
      results.push({ name: currentName, links: [...currentLinks] })
    }
    currentName = null
    currentLinks = []
  }

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      flushCurrent()
      continue
    }

    // Ищем URL в строке
    const urls: string[] = []
    let m
    urlRe.lastIndex = 0
    while ((m = urlRe.exec(trimmed)) !== null) {
      const url = normalizeUrl(m[0])
      if (isProfileUrl(url)) {
        urls.push(url)
      }
    }

    if (urls.length > 0) {
      // Строка содержит URL — может быть "Имя: https://..." или просто URL
      const textBeforeUrl = trimmed
        .replace(urlRe, '')
        .replace(/[:：\-–—()（）]/g, '')
        .trim()
      if (
        textBeforeUrl
        && textBeforeUrl.length > 1
        && textBeforeUrl.length < 60
        && !textBeforeUrl.includes('#')
        && !NOT_NAME_PATTERNS.test(textBeforeUrl)
      ) {
        if (!currentName) {
          currentName = cleanPoetName(textBeforeUrl)
        }
      }
      for (const url of urls) {
        currentLinks.push({ platform: classifyUrl(url), url })
      }
    } else {
      // Строка без URL — может быть именем поэта
      const cleaned = cleanPoetName(trimmed)

      const isLikelyName = cleaned
        && cleaned.length > 1
        && cleaned.length < 60
        && !cleaned.includes('#')
        && !cleaned.includes('http')
        && !NOT_NAME_PATTERNS.test(cleaned)

      if (isLikelyName) {
        flushCurrent()
        currentName = cleaned
        currentLinks = []
      }
    }
  }

  flushCurrent()
  return results
}

async function main() {
  console.log(APPLY ? '🔴 APPLY MODE — записываем в БД' : '🟡 DRY-RUN — только отчёт')
  console.log()

  // 1. Загружаем команды из БД — исключим их каналы
  const { rows: teams } = await pool.query<{
    id: string
    name: string
    telegramLink: string | null
    socialLinks: unknown
  }>('SELECT id, name, "telegramLink", "socialLinks" FROM "Team"')
  const teamUrls = new Set(teams.map((t) => t.telegramLink).filter(Boolean) as string[])
  console.log(`Команд в БД: ${teams.length}, с telegramLink: ${teamUrls.size}`)

  // 2. Загружаем всех игроков
  const { rows: players } = await pool.query<{ id: string; name: string; slug: string; socialLinks: unknown }>(
    'SELECT id, name, slug, "socialLinks" FROM "Player"',
  )
  console.log(`Игроков в БД: ${players.length}`)

  // Известные площадки/организации — не поэты
  const venueNames = new Set([
    'апартаменты №159',
    'ива',
    'firma',
    'апостроф',
    "opezdol's crew",
    'коктейльные',
    'против',
    'поэтория',
  ])

  // Ручной маппинг имён из чатов → имена в БД
  const nameAliases: Record<string, string> = {
    'анна ширмина': 'аня ширмина',
  }
  // Индекс для матчинга по нормализованному имени
  const playerByNormName = new Map<string, (typeof players)[0]>()
  for (const p of players) {
    playerByNormName.set(p.name.toLowerCase().trim(), p)
  }

  // 3. Читаем сырые чанки
  const scriptDir = import.meta.dirname
  const chunkDirs = [
    { dir: path.join(scriptDir, 'chunks-spb'), city: 'SPB' },
    { dir: path.join(scriptDir, 'chunks'), city: 'Moscow' },
  ]

  const allPoetLinks: Array<PoetLinks & { city: string; msgId: number }> = []

  for (const { dir, city } of chunkDirs) {
    const files = fs
      .readdirSync(dir)
      .filter((f: string) => /^chunk-\d+\.json$/.test(f))
      .sort()

    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8')) as Array<{ id: number; text: string }>
      for (const msg of data) {
        if (!msg.text) {
          continue
        }
        if (!msg.text.includes('t.me/') && !msg.text.includes('vk.com/') && !msg.text.includes('stihi.ru/')) {
          continue
        }

        const extracted = extractPoetLinks(msg.text)
        for (const pl of extracted) {
          pl.links = pl.links.filter((l) => !teamUrls.has(l.url))
          if (pl.links.length > 0) {
            allPoetLinks.push({ ...pl, city, msgId: msg.id })
          }
        }
      }
    }
  }

  console.log(`\nИзвлечено пар имя+ссылки: ${allPoetLinks.length}`)

  // 4. Дедупликация: объединяем ссылки одного поэта
  const poetMap = new Map<string, { originalName: string; links: SocialLink[] }>()
  for (const pl of allPoetLinks) {
    const key = pl.name.toLowerCase().trim()
    if (!poetMap.has(key)) {
      poetMap.set(key, { originalName: pl.name, links: [] })
    }
    const entry = poetMap.get(key)!
    for (const link of pl.links) {
      if (!entry.links.some((e) => e.url === link.url)) {
        entry.links.push(link)
      }
    }
  }

  console.log(`Уникальных поэтов с ссылками: ${poetMap.size}`)

  // 5. Матчинг к Player в БД
  let matched = 0
  let unmatched = 0
  const updates: Array<{ playerId: string; playerName: string; links: SocialLink[] }> = []
  const unmatchedList: Array<{ name: string; links: SocialLink[] }> = []

  for (const [normName, { originalName, links }] of poetMap) {
    // Пропускаем площадки/организации
    if (venueNames.has(normName)) {
      continue
    }

    let player = playerByNormName.get(normName)

    // Попробуем ручной маппинг
    if (!player && nameAliases[normName]) {
      player = playerByNormName.get(nameAliases[normName])
    }

    // Попробуем без "играющий тренер" и подобного
    if (!player) {
      const cleaned = normName.replace(/^(играющий тренер|тренер|капитан)\s*[-–—:]\s*/i, '').trim()
      player = playerByNormName.get(cleaned)
    }

    // Попробуем "Поэт Имя" → "Имя"
    if (!player) {
      const withoutPoet = normName.replace(/^поэт\s+/i, '').trim()
      player = playerByNormName.get(withoutPoet)
      // Ещё раз через алиас
      if (!player && nameAliases[withoutPoet]) {
        player = playerByNormName.get(nameAliases[withoutPoet])
      }
    }

    if (player) {
      matched++
      const existing = (player.socialLinks as SocialLink[] | null) || []
      const merged = [...existing]
      for (const link of links) {
        if (!merged.some((e) => e.url === link.url)) {
          merged.push(link)
        }
      }
      updates.push({ playerId: player.id, playerName: player.name, links: merged })
    } else {
      unmatched++
      unmatchedList.push({ name: originalName, links })
    }
  }

  console.log(`\n✅ Привязано к Player: ${matched}`)
  console.log(`❌ Не найдено в БД: ${unmatched}`)

  if (unmatchedList.length > 0) {
    console.log(`\n--- Не найденные поэты ---`)
    for (const { name, links } of unmatchedList) {
      console.log(`  ${name}: ${links.map((l) => l.url).join(', ')}`)
    }
  }

  console.log(`\n--- Обновления (${updates.length}) ---`)
  for (const { playerName, links } of updates) {
    console.log(`  ${playerName}: ${links.map((l) => `[${l.platform}] ${l.url}`).join(', ')}`)
  }

  // 6. Применяем если --apply
  if (APPLY && updates.length > 0) {
    console.log(`\n🔴 Записываю ${updates.length} обновлений Player...`)
    for (const { playerId, links } of updates) {
      await pool.query('UPDATE "Player" SET "socialLinks" = $1 WHERE id = $2', [JSON.stringify(links), playerId])
    }
    console.log('✅ Player обновлены!')
  }

  // 7. Миграция Team.telegramLink → socialLinks
  const teamsToMigrate = teams.filter((t) => t.telegramLink && !t.socialLinks)
  if (teamsToMigrate.length > 0) {
    console.log(`\n--- Миграция Team.telegramLink → socialLinks (${teamsToMigrate.length} команд) ---`)
    for (const t of teamsToMigrate) {
      const links: SocialLink[] = [{ platform: 'telegram', url: t.telegramLink! }]
      console.log(`  ${t.name}: ${t.telegramLink}`)
      if (APPLY) {
        await pool.query('UPDATE "Team" SET "socialLinks" = $1 WHERE id = $2', [JSON.stringify(links), t.id])
      }
    }
    if (APPLY) {
      console.log('✅ Команды мигрированы!')
    }
  }

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
