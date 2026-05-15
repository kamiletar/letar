/**
 * Парсер вопросов психолога из markdown-файлов.
 *
 * Извлекает BAR/PAG/DPR скоринг из 20 md-файлов и формирует JSON
 * для последующего сидирования в БД.
 *
 * Форматы файлов:
 *   1) Вопросы 1-1665 — существующие, нужно дополнить BAR/PAG/DPR
 *   2) Вопросы 1666-1765 — новые (BAR-фокус)
 *   3) Вопросы 1766-1955 — новые (PAG/DPR-фокус)
 *
 * Запуск: bun apps/kami/prisma/parse-psychologist-data.ts
 */

import { readdirSync } from 'node:fs'
import { join } from 'node:path'

// === Типы ===

interface NewScores {
  BAR: number
  PAG: number
  DPR: number
}

interface OptionData {
  text: string
  existingScoring: Record<string, number>
  BAR: number
  PAG: number
  DPR: number
}

interface NewQuestion {
  scenario: string
  options: Record<string, OptionData>
}

interface OutputData {
  existing_updates: Record<string, Record<string, NewScores>>
  new_questions: Record<string, NewQuestion>
  stats: {
    total_questions_parsed: number
    existing_updated: number
    new_created: number
    bar_nonzero: number
    pag_nonzero: number
    dpr_nonzero: number
  }
}

// === Утилиты для парсинга ===

/** Парсит строку вида "PAR:3, ANT:1" в объект { PAR: 3, ANT: 1 } */
function parseExistingScoring(text: string): Record<string, number> {
  const result: Record<string, number> = {}
  // Ищем паттерны КЛЮЧ:ЧИСЛО
  const matches = text.matchAll(/([A-Z]{2,4}):(\d+)/g)
  for (const m of matches) {
    result[m[1]] = parseInt(m[2], 10)
  }
  return result
}

/**
 * Извлекает BAR/PAG/DPR из строк скоринга.
 * Поддерживает все вариации формата:
 *   **BAR: 0**\n   **PAG: 0** | **DPR: 0**
 *   **PAG: 3** | **DPR: 0** | **BAR: 0**
 *   **BAR: 0** | **PAG: 3** | **DPR: 0**
 */
function parseNewScores(lines: string[]): NewScores {
  const scores: NewScores = { BAR: 0, PAG: 0, DPR: 0 }
  const combined = lines.join(' ')

  // Ищем все паттерны **КЛЮЧ: ЧИСЛО** в объединённой строке
  const matches = combined.matchAll(/\*\*(BAR|PAG|DPR):\s*(\d+)\*\*/g)
  for (const m of matches) {
    const key = m[1] as keyof NewScores
    scores[key] = parseInt(m[2], 10)
  }

  return scores
}

/** Определяет, является ли вопрос существующим (1-1665) или новым (1666+) */
function isExistingQuestion(num: number): boolean {
  return num <= 1665
}

// === Основной парсер ===

interface ParsedOption {
  letter: string
  text: string
  existingScoring: Record<string, number>
  BAR: number
  PAG: number
  DPR: number
}

interface ParsedQuestion {
  number: number
  scenario: string
  options: ParsedOption[]
}

function parseMarkdownFile(content: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = []

  // Разбиваем на блоки по заголовкам вопросов
  const questionBlocks = content.split(/^### Вопрос (\d+)/m)

  // Первый элемент — заголовок файла (до первого вопроса), пропускаем
  // Далее чередуются: номер, содержимое, номер, содержимое...
  for (let i = 1; i < questionBlocks.length; i += 2) {
    const num = parseInt(questionBlocks[i], 10)
    const block = questionBlocks[i + 1]
    if (!block) continue

    const lines = block.split('\n')

    // Извлекаем сценарий — строка в **жирном** после пустой строки
    let scenario = ''
    for (const line of lines) {
      const scenarioMatch = line.match(/^\*\*(.+)\*\*\s*$/)
      if (scenarioMatch) {
        scenario = scenarioMatch[1]
        break
      }
    }

    // Парсим варианты ответов
    const options: ParsedOption[] = []
    let currentOption: {
      letter: string
      text: string
      scoringLines: string[]
      existingScoring: Record<string, number>
    } | null = null

    for (const line of lines) {
      // Начало нового варианта: "A) Текст..." или "A) [Вариант A]"
      const optionMatch = line.match(/^([A-F])\)\s+(.+)/)
      if (optionMatch) {
        // Сохраняем предыдущий вариант
        if (currentOption) {
          const scores = parseNewScores(currentOption.scoringLines)
          options.push({
            letter: currentOption.letter,
            text: currentOption.text,
            existingScoring: currentOption.existingScoring,
            ...scores,
          })
        }
        currentOption = {
          letter: optionMatch[1],
          text: optionMatch[2].trim(),
          scoringLines: [],
          existingScoring: {},
        }
        continue
      }

      if (!currentOption) continue

      // Строка с текущим скорингом: _Текущий скоринг: PAR:3, ANT:1_
      const scoringMatch = line.match(/_Текущий скоринг:\s*(.+)_/)
      if (scoringMatch) {
        currentOption.existingScoring = parseExistingScoring(scoringMatch[1])
        continue
      }

      // Строки с BAR/PAG/DPR — могут быть в разном формате
      if (line.match(/\*\*(BAR|PAG|DPR):/)) {
        currentOption.scoringLines.push(line)
        continue
      }
    }

    // Не забываем последний вариант
    if (currentOption) {
      const scores = parseNewScores(currentOption.scoringLines)
      options.push({
        letter: currentOption.letter,
        text: currentOption.text,
        existingScoring: currentOption.existingScoring,
        ...scores,
      })
    }

    if (options.length > 0) {
      questions.push({ number: num, scenario, options })
    }
  }

  return questions
}

// === Главная функция ===

async function main() {
  const SOURCE_DIR = 'C:/Users/Kami/Desktop/kami_tz'
  const OUTPUT_PATH = 'C:/web/lena/apps/kami/prisma/psychologist-scoring.json'

  // Получаем список файлов с вопросами
  const allFiles = readdirSync(SOURCE_DIR)
  const questionFiles = allFiles
    .filter((f) => f.startsWith('questions_') && f.endsWith('.md') && !f.includes('SCORED'))
    .sort()

  console.log(`Найдено файлов с вопросами: ${questionFiles.length}`)
  console.log(questionFiles.map((f) => `  ${f}`).join('\n'))
  console.log()

  // Результат
  const output: OutputData = {
    existing_updates: {},
    new_questions: {},
    stats: {
      total_questions_parsed: 0,
      existing_updated: 0,
      new_created: 0,
      bar_nonzero: 0,
      pag_nonzero: 0,
      dpr_nonzero: 0,
    },
  }

  // Множества для подсчёта уникальных вопросов с ненулевыми шкалами
  const barNonzeroQuestions = new Set<number>()
  const pagNonzeroQuestions = new Set<number>()
  const dprNonzeroQuestions = new Set<number>()

  // Парсим каждый файл
  for (const filename of questionFiles) {
    const filepath = join(SOURCE_DIR, filename)
    const content = await Bun.file(filepath).text()
    const questions = parseMarkdownFile(content)

    console.log(`${filename}: ${questions.length} вопросов`)

    for (const q of questions) {
      output.stats.total_questions_parsed++

      // Проверяем ненулевые шкалы
      for (const opt of q.options) {
        if (opt.BAR > 0) barNonzeroQuestions.add(q.number)
        if (opt.PAG > 0) pagNonzeroQuestions.add(q.number)
        if (opt.DPR > 0) dprNonzeroQuestions.add(q.number)
      }

      if (isExistingQuestion(q.number)) {
        // Существующий вопрос — только BAR/PAG/DPR
        output.stats.existing_updated++
        const optMap: Record<string, NewScores> = {}
        for (const opt of q.options) {
          optMap[opt.letter] = { BAR: opt.BAR, PAG: opt.PAG, DPR: opt.DPR }
        }
        output.existing_updates[String(q.number)] = optMap
      } else {
        // Новый вопрос — полная информация
        output.stats.new_created++
        const optMap: Record<string, OptionData> = {}
        for (const opt of q.options) {
          optMap[opt.letter] = {
            text: opt.text,
            existingScoring: opt.existingScoring,
            BAR: opt.BAR,
            PAG: opt.PAG,
            DPR: opt.DPR,
          }
        }
        output.new_questions[String(q.number)] = {
          scenario: q.scenario,
          options: optMap,
        }
      }
    }
  }

  // Финальная статистика
  output.stats.bar_nonzero = barNonzeroQuestions.size
  output.stats.pag_nonzero = pagNonzeroQuestions.size
  output.stats.dpr_nonzero = dprNonzeroQuestions.size

  // Записываем JSON
  await Bun.write(OUTPUT_PATH, JSON.stringify(output, null, 2))

  // Выводим статистику
  console.log('\n=== Статистика ===')
  console.log(`Всего вопросов распарсено: ${output.stats.total_questions_parsed}`)
  console.log(`Существующих обновлено:    ${output.stats.existing_updated}`)
  console.log(`Новых создано:             ${output.stats.new_created}`)
  console.log(`Вопросов с BAR > 0:        ${output.stats.bar_nonzero}`)
  console.log(`Вопросов с PAG > 0:        ${output.stats.pag_nonzero}`)
  console.log(`Вопросов с DPR > 0:        ${output.stats.dpr_nonzero}`)
  console.log(`\nJSON записан в: ${OUTPUT_PATH}`)
}

main().catch(console.error)
