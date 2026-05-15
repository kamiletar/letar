import { chatSSEManager } from './chat-sse-manager'

/**
 * Уведомить участников чата о новом сообщении через SSE
 *
 * Отправляет событие всем активным SSE подключениям участников чата.
 * Это триггерит обновление счетчика непрочитанных сообщений в реальном времени.
 *
 * @param participantIds - ID пользователей, которым нужно отправить уведомление
 */
export function notifyChatUpdate(participantIds: string[]) {
  // Отправляем SSE событие всем участникам
  // Клиент получит событие и запросит обновленный счетчик непрочитанных
  chatSSEManager.sendToUsers(participantIds, 'chat-update', {
    timestamp: new Date().toISOString(),
  })

  console.warn(`[SSE] Sent chat-update to ${participantIds.length} participants`)
}
