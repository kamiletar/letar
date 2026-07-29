import { EventEmitter } from 'node:events'
import type { MentorEvent } from './schema'

// Общая на процесс Next.js шина событий. SSE-эндпоинт подписывается,
// POST /api/mentor/emit публикует. Единственный источник правды в рамках одного
// запущенного процесса — студия одного пользователя, горизонтальное
// масштабирование не нужно.
//
// globalThis, а не обычная module-scope переменная: в dev-режиме Turbopack каждый
// route.ts компилируется как отдельная точка входа и может подключить свою копию
// модуля — обычный `const bus = new EventEmitter()` тогда не гарантированно один и
// тот же объект для /api/mentor/events и /api/mentor/emit (тот же паттерн, что и
// кэширование Prisma-клиента через globalThis в apps/*/src/lib/db.ts).
const globalForMentorBus = globalThis as unknown as { __synthMentorBus?: EventEmitter }

const bus = globalForMentorBus.__synthMentorBus ?? new EventEmitter()
bus.setMaxListeners(50)
globalForMentorBus.__synthMentorBus = bus

const EVENT = 'mentor-event'

export function publishMentorEvent(event: MentorEvent): void {
  bus.emit(EVENT, event)
}

export function subscribeMentorEvents(listener: (event: MentorEvent) => void): () => void {
  bus.on(EVENT, listener)
  return () => bus.off(EVENT, listener)
}
