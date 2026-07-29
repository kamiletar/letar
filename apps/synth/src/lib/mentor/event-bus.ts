import { EventEmitter } from 'node:events'
import type { MentorEvent } from './schema'

// Общая на процесс Next.js шина событий. SSE-эндпоинт подписывается,
// POST /api/mentor/emit публикует. Единственный источник правды в рамках одного
// запущенного процесса — студия одного пользователя, горизонтальное
// масштабирование не нужно.
const bus = new EventEmitter()
bus.setMaxListeners(50)

const EVENT = 'mentor-event'

export function publishMentorEvent(event: MentorEvent): void {
  bus.emit(EVENT, event)
}

export function subscribeMentorEvents(listener: (event: MentorEvent) => void): () => void {
  bus.on(EVENT, listener)
  return () => bus.off(EVENT, listener)
}
