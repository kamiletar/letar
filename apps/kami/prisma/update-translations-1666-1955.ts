/**
 * Скрипт обновления английских переводов для вопросов 1666-1955.
 * Парсит файл переводов и обновляет scenarioEn + textEn опций в БД.
 *
 * Запуск:
 *   cd apps/kami && bun run prisma/update-translations-1666-1955.ts
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pool } from 'pg'

// --- Загрузка .env ---

const envPath = join(__dirname, '..', '.env')
try {
  const envContent = readFileSync(envPath, 'utf-8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) { continue }
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) { continue }
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed
      .slice(eqIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
} catch {
  // .env не найден — ожидаем DATABASE_URL из окружения
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL не задан. Укажи через .env или переменную окружения.')
  process.exit(1)
}

// --- Типы ---

interface ParsedQuestion {
  questionNumber: number
  scenarioEn: string
  options: [string, string, string, string] // A, B, C, D — английские тексты
}

interface QuizOption {
  text: string
  textEn: string
  scoring: Record<string, number>
}

// --- Парсинг файла переводов ---

function parseTranslationFile(filePath: string): ParsedQuestion[] {
  const content = readFileSync(filePath, 'utf-8')
  const questions: ParsedQuestion[] = []

  // Разбиваем на блоки по разделителю ---
  const blocks = content.split(/^---$/m)

  for (const block of blocks) {
    // Ищем заголовок вопроса
    const headerMatch = block.match(/###\s*Вопрос\s+(\d+)/)
    if (!headerMatch) { continue }

    const questionNumber = parseInt(headerMatch[1], 10)

    // Фильтруем только нужный диапазон
    if (questionNumber < 1666 || questionNumber > 1955) { continue }

    // Извлекаем английский сценарий
    const scenarioMatch = block.match(/\*\*Scenario:\*\*\s*(.+)/)
    if (!scenarioMatch) {
      console.warn(`⚠️ Вопрос ${questionNumber}: не найден английский сценарий`)
      continue
    }
    const scenarioEn = scenarioMatch[1].trim()

    // Извлекаем английские варианты ответов
    // Паттерн: после русской строки "X) ..." идёт английская "X) ..."
    // Берём все строки с буквами A-D, группируем попарно (русский, английский)
    const lines = block.split('\n')
    const optionTexts: Record<string, string> = {}

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Ищем русскую строку варианта (первое вхождение буквы)
      const ruMatch = line.match(/^([ABCD])\)\s+.+/)
      if (!ruMatch) { continue }

      const letter = ruMatch[1]

      // Следующая непустая строка должна быть английским переводом с той же буквой
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim()
        if (!nextLine) { continue }

        const enMatch = nextLine.match(new RegExp(`^${letter}\\)\\s+(.+)`))
        if (enMatch) {
          optionTexts[letter] = enMatch[1].trim()
          i = j // Перескакиваем обработанные строки
        }
        break // Проверяем только первую непустую строку после текущей
      }
    }

    // Проверяем что все 4 варианта есть
    const allOptions = ['A', 'B', 'C', 'D']
    const missing = allOptions.filter((l) => !optionTexts[l])
    if (missing.length > 0) {
      console.warn(`⚠️ Вопрос ${questionNumber}: отсутствуют переводы для вариантов ${missing.join(', ')}`)
      continue
    }

    questions.push({
      questionNumber,
      scenarioEn,
      options: [optionTexts['A'], optionTexts['B'], optionTexts['C'], optionTexts['D']],
    })
  }

  return questions
}

// --- Обновление БД ---

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

async function updateTranslations(questions: ParsedQuestion[]) {
  console.log(`\n📝 Обновление переводов для ${questions.length} вопросов...\n`)

  let updated = 0
  let notFound = 0
  let errors = 0

  for (const q of questions) {
    try {
      const sortOrder = q.questionNumber - 1

      // Получаем текущий вопрос из БД
      const result = await pool.query('SELECT id, options FROM "QuizQuestion" WHERE "sortOrder" = $1', [sortOrder])

      if (result.rows.length === 0) {
        notFound++
        if (notFound <= 5) {
          console.warn(`  ⚠️ Вопрос #${q.questionNumber} (sortOrder=${sortOrder}) не найден в БД`)
        }
        continue
      }

      const row = result.rows[0]
      const options: QuizOption[] = typeof row.options === 'string' ? JSON.parse(row.options) : row.options

      // Обновляем textEn для каждого варианта
      for (let i = 0; i < 4; i++) {
        if (options[i]) {
          options[i].textEn = q.options[i]
        }
      }

      // Обновляем scenarioEn и options в БД
      await pool.query('UPDATE "QuizQuestion" SET "scenarioEn" = $1, options = $2 WHERE id = $3', [
        q.scenarioEn,
        JSON.stringify(options),
        row.id,
      ])

      updated++

      // Прогресс каждые 50 вопросов
      if (updated % 50 === 0) {
        console.log(`  ... обновлено ${updated}/${questions.length}`)
      }
    } catch (err) {
      errors++
      console.error(`  ❌ Ошибка вопроса #${q.questionNumber}:`, (err as Error).message)
    }
  }

  return { updated, notFound, errors }
}

// --- Главная функция ---

async function main() {
  console.log('🚀 Обновление английских переводов вопросов 1666-1955')
  console.log(`  База данных: ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`)

  // Проверяем подключение
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM "QuizQuestion"')
    console.log(`  Вопросов в БД: ${res.rows[0].count}`)
  } catch (err) {
    console.error('❌ Не удалось подключиться к БД:', (err as Error).message)
    process.exit(1)
  }

  // Парсим файл переводов
  // Ищем файл перевода рядом со скриптом или на рабочем столе
  const localPath = join(__dirname, 'kami_translation_tz.md')
  const desktopPath = 'C:/Users/Kami/Desktop/kami_translation_tz.md'
  const translationFile = existsSync(localPath) ? localPath : desktopPath
  console.log(`\n📖 Парсинг файла переводов: ${translationFile}`)

  const questions = parseTranslationFile(translationFile)
  console.log(`  Распознано вопросов: ${questions.length}`)

  if (questions.length === 0) {
    console.error('❌ Не удалось распознать ни одного вопроса')
    process.exit(1)
  }

  // Проверяем диапазон
  const nums = questions.map((q) => q.questionNumber).sort((a, b) => a - b)
  console.log(`  Диапазон: ${nums[0]} — ${nums[nums.length - 1]}`)

  if (questions.length < 290) {
    console.warn(`  ⚠️ Ожидалось 290 вопросов, распознано ${questions.length}`)
  }

  // Обновляем БД
  const stats = await updateTranslations(questions)

  // Финальная статистика
  console.log('\n' + '='.repeat(50))
  console.log('📊 Итоговая статистика:')
  console.log(`  Распознано из файла:  ${questions.length}`)
  console.log(`  Обновлено в БД:       ${stats.updated}`)
  console.log(`  Не найдено в БД:      ${stats.notFound}`)
  console.log(`  Ошибок:               ${stats.errors}`)
  console.log('='.repeat(50))

  await pool.end()
  console.log('\n✅ Готово!')
}

main().catch((err) => {
  console.error('❌ Фатальная ошибка:', err)
  pool.end()
  process.exit(1)
})
