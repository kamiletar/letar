/**
 * Общий примитив персистентного состояния cron-проверок (canary-style): читает/пишет
 * небольшой JSON-файл на смонтированном `/home/deploy/letar`, переживающий рестарт
 * контейнера. Раньше был продублирован в `email-canary.ts` и `backup-freshness.ts`
 * (каждый со своей копией `try { existsSync + readFileSync + JSON.parse } catch {}`).
 *
 * Не абстрагирует сам дебаунс-паттерн — только низкоуровневое чтение/запись файла.
 * Осознанно: у трёх текущих потребителей (`email-canary.ts`, `backup-freshness.ts`,
 * `health-check.ts`) семантика "когда считать эпизод новым и слать алерт снова" разная
 * не только в деталях, а по типу триггера:
 * - email-canary — счётчик `consecutiveFailures` с порогом (`ALERT_THRESHOLD`) на ДВЕ
 *   независимые ноги (internal/external) — алерт только после N подряд-неудач;
 * - backup-freshness — один плоский boolean `alerted`, level-triggered (алерт сразу,
 *   пока условие "устарел" истинно, сброс при появлении свежего файла);
 * - health-check — три разных механизма в одном файле: `Record<string, boolean>` для
 *   порогов CPU/память/диск (level-triggered, как у backup-freshness, но с ключом на
 *   каждую метрику/БД) — и ОТДЕЛЬНО edge-triggered переход состояния контейнеров
 *   (`Record<string, string>` с предыдущим ЗНАЧЕНИЕМ состояния, не просто "алертили или
 *   нет" — алерт на сам факт перехода running→exited, а `restarting` вообще не дебаунсится).
 *
 * Общий generic-хелпер (`runDebouncedCheck<TState>`), покрывающий все три случая, либо
 * не влез бы во все три модели триггера одновременно, либо превратился в конфигурационный
 * комбайн (threshold + keying + edge-vs-level) сложнее, чем нынешний прямой код на каждом
 * сайте. Унификация сознательно отклонена — при добавлении четвёртой cron-проверки сверяться
 * с этим списком, а не считать текущее дублирование недосмотром.
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
