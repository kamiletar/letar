/**
 * Общий каркас long-poll ожидания: держит запрос, пока `ready()` не станет true после очередного
 * события эмиттера или пока не истечёт `waitMs`. Используется /api/e2e/wait; деплойный
 * /api/deploy/wait ждёт по своим условиям (смена фазы/залипание) и написан отдельно.
 */

import type { EventEmitter } from 'events'

/** Верхняя граница одного long-poll запроса — Fastify/nginx-таймауты на туннеле (как у deploy_wait). */
export const MAX_WAIT_SECONDS = 120
export const DEFAULT_WAIT_SECONDS = 60

/** Разбирает waitSeconds из query: мусор → дефолт, значение клампится в 1..MAX_WAIT_SECONDS. */
export function parseWaitMs(waitSeconds: string | undefined): number {
  const parsed = parseInt(waitSeconds ?? String(DEFAULT_WAIT_SECONDS), 10) || DEFAULT_WAIT_SECONDS
  return Math.min(Math.max(1, parsed), MAX_WAIT_SECONDS) * 1000
}

/**
 * Резолвится сразу, если `ready()` уже true; иначе — при первом событии `key`, после которого
 * `ready()` true, либо по таймауту. Слушатель и таймер всегда снимаются.
 */
export function waitUntil(options: {
  emitter: EventEmitter
  key: string
  waitMs: number
  ready: () => boolean
}): Promise<void> {
  const { emitter, key, waitMs, ready } = options
  if (ready()) {
    return Promise.resolve()
  }
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = (): void => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      emitter.off(key, onEvent)
      resolve()
    }
    const onEvent = (): void => {
      if (ready()) {
        finish()
      }
    }
    const timer = setTimeout(finish, waitMs)
    emitter.on(key, onEvent)
  })
}
