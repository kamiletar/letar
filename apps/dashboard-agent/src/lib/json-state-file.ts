/**
 * Общий примитив персистентного состояния cron-проверок (canary-style): читает/пишет
 * небольшой JSON-файл на смонтированном `/home/deploy/letar`, переживающий рестарт
 * контейнера. Раньше был продублирован в `email-canary.ts` и `backup-freshness.ts`
 * (каждый со своей копией `try { existsSync + readFileSync + JSON.parse } catch {}`).
 *
 * Не абстрагирует сам дебаунс-паттерн (пороги, счётчик подряд-неудач у email-canary —
 * это две ноги и `consecutiveFailures`, у backup-freshness — один плоский `alerted`) —
 * только низкоуровневое чтение/запись файла, которое у обоих идентично.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'

export function loadJsonState<T>(statePath: string, fallback: T): T {
  try {
    if (existsSync(statePath)) {
      return JSON.parse(readFileSync(statePath, 'utf-8')) as T
    }
  } catch {
    // повреждённый/нечитаемый файл состояния — начинаем с чистого листа
  }
  return fallback
}

export function saveJsonState<T>(statePath: string, state: T, logLabel: string): void {
  try {
    writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8')
  } catch (error) {
    console.error(`[${logLabel}] Не удалось сохранить состояние:`, error)
  }
}
