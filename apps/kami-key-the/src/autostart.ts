/**
 * Автозагрузка Windows через реестр
 *
 * HKCU\Software\Microsoft\Windows\CurrentVersion\Run
 * Ключ: KamiKeyThe
 * Значение: путь к node + скрипту
 */

import { execFileSync } from 'node:child_process'

const REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const REG_VALUE = 'KamiKeyThe'

/** Получить команду запуска (node + абсолютный путь к скрипту) */
function getLaunchCommand(): string {
  const nodePath = process.execPath
  const scriptPath = process.argv[1]
  return `"${nodePath}" "${scriptPath}"`
}

/** Проверить, включена ли автозагрузка */
export function isAutostartEnabled(): boolean {
  try {
    const result = execFileSync('reg', ['query', REG_KEY, '/v', REG_VALUE], {
      encoding: 'utf-8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    return result.includes(REG_VALUE)
  } catch {
    return false
  }
}

/** Включить автозагрузку */
export function enableAutostart(): boolean {
  try {
    const cmd = getLaunchCommand()
    execFileSync('reg', ['add', REG_KEY, '/v', REG_VALUE, '/t', 'REG_SZ', '/d', cmd, '/f'], {
      encoding: 'utf-8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    console.log('Автозагрузка включена')
    return true
  } catch (err) {
    console.error('Не удалось включить автозагрузку:', err)
    return false
  }
}

/** Выключить автозагрузку */
export function disableAutostart(): boolean {
  try {
    execFileSync('reg', ['delete', REG_KEY, '/v', REG_VALUE, '/f'], {
      encoding: 'utf-8',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    console.log('Автозагрузка выключена')
    return true
  } catch (err) {
    console.error('Не удалось выключить автозагрузку:', err)
    return false
  }
}
