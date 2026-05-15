/**
 * Извлечение организаторов и фото из Telegram-экспортов.
 * Работает напрямую с result.json (без AI).
 *
 * Запуск: bun run scripts/migrate/extract-photos-orgs.ts
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const MOSCOW_SRC = 'C:/Users/Kami/Downloads/Telegram Desktop/slam'
const SPB_SRC = 'C:/Users/Kami/Downloads/Telegram Desktop/spb'
const OUTPUT_DIR = join(import.meta.dirname, 'manual-data')
const UPLOADS_DIR = join(import.meta.dirname, '../../uploads')

interface TgMessage {
  id: number
  type: string
  date: string
  text: string | Array<string | { type: string; text: string }>
  photo?: string
  width?: number
  height?: number
  [key: string]: unknown
}

function getText(msg: TgMessage): string {
  if (!msg.text) {
    return ''
  }
  if (typeof msg.text === 'string') {
    return msg.text
  }
  return msg.text.map((p) => (typeof p === 'string' ? p : p.text || '')).join('')
}

function loadExport(dir: string): TgMessage[] {
  const raw = readFileSync(join(dir, 'result.json'), 'utf-8')
  const data = JSON.parse(raw)
  return data.messages.filter((m: TgMessage) => m.type === 'message')
}

// ============================================
// Организаторы
// ============================================

interface Organizer {
  msgId: number
  name: string
  role: string
  bio: string
  photo: string | null
  city: string
}

function extractOrganizers(messages: TgMessage[], city: string): Organizer[] {
  const orgs: Organizer[] = []

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const text = getText(m)

    // Посты #герои или "организатор" с именем
    if (/оргкомитет|#герои|организатор.+кубка|создатель.*кубка/i.test(text) && m.photo && text.length > 30) {
      // Извлекаем имя из текста
      const lines = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      // Ищем имя — обычно первая значимая строка после хештега
      let name = ''
      let bio = ''
      let role = 'организатор'

      for (const line of lines) {
        if (line.startsWith('#')) {
          continue
        }
        if (/оргкомитет|организатор|кубок.*знать/i.test(line)) {
          continue
        }
        if (/представляем|команда.*благодаря/i.test(line)) {
          continue
        }

        // Имя — короткая строка (2-4 слова, без спецсимволов)
        if (!name && /^[А-ЯЁA-Z][а-яёa-z]+ [А-ЯЁA-Z][а-яёa-z]+/.test(line) && line.length < 50) {
          name = line.replace(/\s*[–—-]\s*.*$/, '').trim()
          // Роль после тире
          const roleMatch = line.match(/[–—-]\s*(.+)$/)
          if (roleMatch) {
            role = roleMatch[1].trim()
          }
          continue
        }

        // Остальное — bio
        if (name && !bio) {
          bio = lines.slice(lines.indexOf(line)).join(' ').substring(0, 500)
          break
        }
      }

      if (name) {
        orgs.push({
          msgId: m.id,
          name,
          role,
          bio,
          photo: m.photo,
          city,
        })
      }
    }

    // Посты-представления тренеров с ролью "тренер" и фото
    if (
      m.photo &&
      /тренер команды|играющий тренер|неиграющий тренер/i.test(text) &&
      text.length > 20 &&
      text.length < 500
    ) {
      const nameMatch = text.match(
        /(?:играющий |неиграющий )?тренер(?:\s+команды)?\s*[«""]?[^»""]*[»""]?\s*[–—-]\s*(.+?)(?:\.|$|\n)/i
      )
      if (nameMatch) {
        // Это тренер, не организатор — пропускаем (уже в profiles)
      }
    }
  }

  return orgs
}

// ============================================
// Фото к матчам
// ============================================

interface MatchPhoto {
  msgId: number
  date: string
  photo: string
  caption: string
  /** Контекст: имена команд если определимы */
  teams: string | null
}

function extractMatchPhotos(messages: TgMessage[]): MatchPhoto[] {
  const photos: MatchPhoto[] = []

  for (const m of messages) {
    if (!m.photo) {
      continue
    }
    const text = getText(m)

    // Фото с результатом или хештегом #итоги
    if (/побежда|победила|со счётом|со счетом|#итоги|финальн/i.test(text)) {
      photos.push({
        msgId: m.id,
        date: m.date.substring(0, 10),
        photo: m.photo,
        caption: text.substring(0, 200),
        teams: extractTeamPair(text),
      })
    }
  }

  return photos
}

// ============================================
// Фото к командам/тренерам
// ============================================

interface TeamPhoto {
  msgId: number
  date: string
  photo: string
  caption: string
  teamOrPerson: string
}

function extractTeamPhotos(messages: TgMessage[]): TeamPhoto[] {
  const photos: TeamPhoto[] = []

  for (const m of messages) {
    if (!m.photo) {
      continue
    }
    const text = getText(m)

    // Посты с командами
    if (/^(команда |знакомьтесь|играющий тренер|неиграющий тренер|тренер команды)/im.test(text)) {
      // Извлечь имя команды или тренера
      let label = ''
      const teamMatch = text.match(/[Кк]оманда\s*[«""]?([^»""]+?)[»""]?\s*[\n.!]/i)
      const trainerMatch = text.match(
        /(?:играющий |неиграющий )?тренер(?:\s+команды)?\s*[«""]?([^»""]+?)[»""]?\s*[–—-]\s*(.+?)(?:\.|$|\n)/i
      )

      if (teamMatch) {
        label = `Команда ${teamMatch[1].trim()}`
      } else if (trainerMatch) {
        label = `${trainerMatch[2].trim()} (${trainerMatch[1].trim()})`
      } else {
        label = text.substring(0, 60).replace(/\n/g, ' ')
      }

      photos.push({
        msgId: m.id,
        date: m.date.substring(0, 10),
        photo: m.photo,
        caption: text.substring(0, 200),
        teamOrPerson: label,
      })
    }
  }

  return photos
}

// ============================================
// Утилиты
// ============================================

function extractTeamPair(text: string): string | null {
  const match = text.match(
    /(?:встретились|играли|матч[ае]?)\s+(?:команды\s+)?[«""]?(.+?)[»""]?\s+(?:и|vs|—|–|-)\s+[«""]?(.+?)[»""]?(?:\s*[.!\n])/i
  )
  if (match) {
    return `${match[1].trim()} vs ${match[2].trim()}`
  }

  const scoreMatch = text.match(/([А-ЯЁA-Za-z'\s]+?)\s+\d{3}\s*[-:–]\s*\d{3}\s+([А-ЯЁA-Za-z'\s]+?)[\s.!\n]/)
  if (scoreMatch) {
    return `${scoreMatch[1].trim()} vs ${scoreMatch[2].trim()}`
  }

  return null
}

/** Копирование фото из экспорта в uploads */
function copyPhoto(srcDir: string, photoPath: string, destSubdir: string): string | null {
  const srcFile = join(srcDir, photoPath)
  if (!existsSync(srcFile)) {
    console.warn(`  ⚠ Фото не найдено: ${srcFile}`)
    return null
  }

  const destDir = join(UPLOADS_DIR, destSubdir)
  mkdirSync(destDir, { recursive: true })

  const filename = basename(photoPath)
  const destFile = join(destDir, filename)

  if (!existsSync(destFile)) {
    copyFileSync(srcFile, destFile)
  }

  return `${destSubdir}/${filename}`
}

// ============================================
// Main
// ============================================

function main() {
  console.log('=== Извлечение организаторов и фото ===\n')

  mkdirSync(UPLOADS_DIR, { recursive: true })

  // Москва
  console.log('📍 Москва:')
  const moscowMsgs = loadExport(MOSCOW_SRC)
  console.log(`  Всего сообщений: ${moscowMsgs.length}`)

  const moscowOrgs = extractOrganizers(moscowMsgs, 'Москва')
  console.log(`  Организаторы: ${moscowOrgs.length}`)
  for (const o of moscowOrgs) {
    console.log(`    ${o.name} (${o.role}) — ${o.photo}`)
  }

  const moscowMatchPhotos = extractMatchPhotos(moscowMsgs)
  console.log(`  Фото к матчам: ${moscowMatchPhotos.length}`)

  const moscowTeamPhotos = extractTeamPhotos(moscowMsgs)
  console.log(`  Фото к командам/тренерам: ${moscowTeamPhotos.length}`)

  // Копируем фото организаторов
  console.log('\n  Копирование фото организаторов...')
  for (const o of moscowOrgs) {
    if (o.photo) {
      const path = copyPhoto(MOSCOW_SRC, o.photo, 'organizers/moscow')
      if (path) {
        o.photo = path
      }
    }
  }

  // СПб
  console.log('\n📍 СПб:')
  const spbMsgs = loadExport(SPB_SRC)
  console.log(`  Всего сообщений: ${spbMsgs.length}`)

  const spbOrgs = extractOrganizers(spbMsgs, 'Санкт-Петербург')
  console.log(`  Организаторы: ${spbOrgs.length}`)
  for (const o of spbOrgs) {
    console.log(`    ${o.name} (${o.role}) — ${o.photo}`)
  }

  const spbMatchPhotos = extractMatchPhotos(spbMsgs)
  console.log(`  Фото к матчам: ${spbMatchPhotos.length}`)

  const spbTeamPhotos = extractTeamPhotos(spbMsgs)
  console.log(`  Фото к командам/тренерам: ${spbTeamPhotos.length}`)

  // Копируем фото организаторов СПб
  console.log('\n  Копирование фото организаторов...')
  for (const o of spbOrgs) {
    if (o.photo) {
      const path = copyPhoto(SPB_SRC, o.photo, 'organizers/spb')
      if (path) {
        o.photo = path
      }
    }
  }

  // Сохраняем результаты
  const result = {
    organizers: { moscow: moscowOrgs, spb: spbOrgs },
    matchPhotos: { moscow: moscowMatchPhotos, spb: spbMatchPhotos },
    teamPhotos: { moscow: moscowTeamPhotos, spb: spbTeamPhotos },
  }

  writeFileSync(join(OUTPUT_DIR, 'photos-orgs.json'), JSON.stringify(result, null, 2), 'utf-8')

  console.log('\n=== ИТОГО ===')
  console.log(`  Организаторы: ${moscowOrgs.length + spbOrgs.length}`)
  console.log(`  Фото к матчам: ${moscowMatchPhotos.length + spbMatchPhotos.length}`)
  console.log(`  Фото к командам: ${moscowTeamPhotos.length + spbTeamPhotos.length}`)
  console.log(`\n  Сохранено: ${join(OUTPUT_DIR, 'photos-orgs.json')}`)
}

main()
