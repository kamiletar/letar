#!/usr/bin/env node
/**
 * PostToolUse хук для автоматического форматирования файлов после Write/Edit.
 *
 * Поддерживаемые расширения:
 * - .ts, .tsx, .js, .jsx — TypeScript/JavaScript
 * - .json — JSON файлы
 * - .md — Markdown
 *
 * Использует dprint для форматирования (быстрее Prettier в ~30 раз).
 * Безопасно использует spawn с массивом аргументов (без shell injection).
 */

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Поддерживаемые расширения
const SUPPORTED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md']

// Исключённые пути (не форматируем)
const EXCLUDED_PATHS = ['node_modules', '.next', 'dist', '.git', 'coverage', '.nx']

// Читаем JSON из stdin
let input = ''
process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  input += chunk
})

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input)

    // Получаем путь к файлу из tool_input
    const filePath = data.tool_input?.file_path || ''

    if (!filePath) {
      process.exit(0)
    }

    // Проверяем расширение
    const ext = path.extname(filePath).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      process.exit(0)
    }

    // Проверяем исключённые пути
    const normalizedPath = filePath.replace(/\\/g, '/')
    for (const excluded of EXCLUDED_PATHS) {
      if (normalizedPath.includes(`/${excluded}/`) || normalizedPath.includes(`\\${excluded}\\`)) {
        process.exit(0)
      }
    }

    // Проверяем что файл существует
    if (!fs.existsSync(filePath)) {
      process.exit(0)
    }

    // Получаем корень проекта
    const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()

    // Запускаем dprint fmt безопасно через spawn
    const dprint = spawn('bun', ['run', 'dprint', 'fmt', filePath], {
      cwd: projectDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false, // Безопасно: не используем shell
    })

    dprint.on('close', (code) => {
      if (code === 0) {
        console.error(`\u2728 Отформатировано: ${path.basename(filePath)}`)
      }
      // Не блокируем даже при ошибке форматирования
      process.exit(0)
    })

    dprint.on('error', () => {
      // Игнорируем ошибки (например, dprint не установлен)
      process.exit(0)
    })
  } catch {
    // При ошибке парсинга просто выходим
    process.exit(0)
  }
})
