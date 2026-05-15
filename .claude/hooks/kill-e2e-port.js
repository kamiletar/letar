#!/usr/bin/env node
/**
 * PreToolUse хук для убийства порта перед запуском E2E тестов.
 *
 * Проблема: dev сервер часто залипает после прерванных тестов.
 * Решение: автоматически убиваем порт перед запуском nx e2e.
 *
 * Exit codes:
 * - 0: продолжить выполнение
 */

const { spawnSync } = require('child_process')

// Маппинг проектов E2E на порты
const PORT_MAP = {
  'driving-school': 3003,
  'premium-rosstil': 3000,
  imot: 3001,
  dashboard: 3002,
  mandala: 3004,
  kami: 3005,
}

// Читаем JSON из stdin
let input = ''
process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  input += chunk
})

process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input)
    const command = data.tool_input?.command || ''

    // Проверяем что это E2E тест
    const e2eMatch = command.match(/nx\s+e2e\s+(\S+)/i)
    if (!e2eMatch) {
      process.exit(0)
    }

    const projectName = e2eMatch[1]

    // Извлекаем базовое имя проекта (убираем -e2e суффикс)
    const baseName = projectName.replace(/-e2e$/, '')

    // Находим порт
    const port = PORT_MAP[baseName]
    if (!port) {
      process.exit(0)
    }

    // Убиваем процесс на порту через npx kill-port
    // На Windows нужен shell: true для корректной работы с .cmd файлами
    // Порт из PORT_MAP (hardcoded integer), shell injection невозможен
    const result = spawnSync('npx', ['kill-port', String(port)], {
      stdio: 'pipe',
      shell: true,
      encoding: 'utf8',
    })
    if (result.status === 0 && result.stdout?.includes('killed')) {
      console.error(`\n🔪 Killed process on port ${port} before E2E tests\n`)
    }

    process.exit(0)
  } catch {
    // При ошибке парсинга разрешаем (fail open)
    process.exit(0)
  }
})
