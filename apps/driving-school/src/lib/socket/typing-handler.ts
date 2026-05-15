import type { Server as ServerIO, Socket } from 'socket.io'
import { z } from 'zod/v4'

/**
 * MEMORY LEAK FIX: Кэширование Zod схемы через globalThis
 *
 * При hot reload Turbopack создаёт новые module instances,
 * но старые модули с Zod схемами остаются в moduleCache.
 */
const globalForSchemas = globalThis as unknown as {
  typingSchema?: z.ZodObject<{ chatId: z.ZodString }>
}

if (!globalForSchemas.typingSchema) {
  globalForSchemas.typingSchema = z.object({
    chatId: z.string().cuid(),
  })
}

const TypingSchema = globalForSchemas.typingSchema

/**
 * Обработчик событий индикатора печати
 * @param socket - Socket.IO socket instance с userId и userName
 * @param io - Socket.IO server instance
 */
export function handleTypingEvents(socket: Socket, _io: ServerIO) {
  const userId = socket.userId
  const userName = socket.userName

  if (!userId) {
    return
  }

  // Пользователь начал печатать
  socket.on('typing', (data) => {
    try {
      const { chatId } = TypingSchema.parse(data)

      // Отправляем событие всем в комнате, кроме отправителя
      socket.to(`chat:${chatId}`).emit('user_typing', {
        userId,
        userName,
      })
    } catch (error) {
      console.error('Error in typing event:', error)
    }
  })

  // Пользователь перестал печатать
  socket.on('stop_typing', (data) => {
    try {
      const { chatId } = TypingSchema.parse(data)

      socket.to(`chat:${chatId}`).emit('user_stopped_typing', {
        userId,
      })
    } catch (error) {
      console.error('Error in stop_typing event:', error)
    }
  })
}
