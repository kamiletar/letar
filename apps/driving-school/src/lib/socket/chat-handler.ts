import { prisma } from '@/lib/db'
import type { Server as ServerIO, Socket } from 'socket.io'
import { z } from 'zod/v4'

/**
 * MEMORY LEAK FIX: Кэширование Zod схем через globalThis
 *
 * При hot reload Turbopack создаёт новые module instances,
 * но старые модули с Zod схемами остаются в moduleCache.
 * Это приводит к накоплению Zod схем (93% heap = 1.5GB!).
 */
const globalForSchemas = globalThis as unknown as {
  chatSchemas?: {
    JoinChatSchema: z.ZodObject<{ chatId: z.ZodString; userId: z.ZodString }>
    SendMessageSchema: z.ZodObject<{ chatId: z.ZodString; content: z.ZodString; replyToId: z.ZodOptional<z.ZodString> }>
    EditMessageSchema: z.ZodObject<{ chatId: z.ZodString; messageId: z.ZodString; content: z.ZodString }>
  }
}

// Создаём схемы только один раз
if (!globalForSchemas.chatSchemas) {
  globalForSchemas.chatSchemas = {
    JoinChatSchema: z.object({
      chatId: z.string().cuid(),
      userId: z.string().cuid(),
    }),
    SendMessageSchema: z.object({
      chatId: z.string().cuid(),
      content: z.string().min(1).max(5000),
      replyToId: z.string().cuid().optional(),
    }),
    EditMessageSchema: z.object({
      chatId: z.string().cuid(),
      messageId: z.string().cuid(),
      content: z.string().min(1).max(5000),
    }),
  }
}

const { JoinChatSchema, SendMessageSchema, EditMessageSchema } = globalForSchemas.chatSchemas

/**
 * Обработчик событий чата
 * @param socket - Socket.IO socket instance с userId и userName
 * @param io - Socket.IO server instance
 */
export function handleChatEvents(socket: Socket, io: ServerIO) {
  const userId = socket.userId
  const userName = socket.userName

  if (!userId) {
    console.error('Socket without userId tried to join chat')
    return
  }

  // Присоединяемся к личной комнате пользователя для уведомлений
  socket.join(`user:${userId}`)

  // Присоединение к чату
  socket.on('join_chat', async (data) => {
    try {
      const { chatId } = JoinChatSchema.parse(data)

      // Проверяем, является ли пользователь участником чата
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId,
        },
      })

      if (!participant) {
        socket.emit('error', { message: 'Доступ к чату запрещён' })
        return
      }

      // Присоединяемся к комнате
      const roomName = `chat:${chatId}`
      await socket.join(roomName)
      // console.warn(`[chat-handler] Socket ${socket.id} joined room: ${roomName}`)

      // Уведомляем других участников
      socket.to(roomName).emit('user_joined', {
        userId,
        userName,
      })

      // console.warn(`User ${userName} joined chat ${chatId}`)
    } catch (error) {
      console.error('Error joining chat:', error)
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Ошибка подключения к чату',
      })
    }
  })

  // Выход из чата
  socket.on('leave_chat', async (data) => {
    try {
      const { chatId } = z.object({ chatId: z.string().cuid() }).parse(data)

      await socket.leave(`chat:${chatId}`)

      socket.to(`chat:${chatId}`).emit('user_left', {
        userId,
        userName,
      })

      // console.warn(`User ${userName} left chat ${chatId}`)
    } catch (error) {
      console.error('Error leaving chat:', error)
    }
  })

  // Отправка сообщения
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, replyToId } = SendMessageSchema.parse(data)

      // Проверяем доступ
      const participant = await prisma.chatParticipant.findFirst({
        where: {
          chatId,
          userId,
        },
      })

      if (!participant) {
        socket.emit('error', { message: 'Доступ к чату запрещён' })
        return
      }

      // Сохраняем сообщение в БД
      const message = await prisma.chatMessage.create({
        data: {
          chatId,
          authorId: userId,
          content,
          replyToId,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          replyTo: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          reactions: {
            select: {
              emoji: true,
              userId: true,
            },
          },
        },
      })

      // Обновляем lastMessageAt в чате
      const updatedChat = await prisma.chat.update({
        where: { id: chatId },
        data: { lastMessageAt: new Date() },
        include: {
          participants: {
            where: { leftAt: null },
            select: { userId: true },
          },
        },
      })

      // Трансформируем сообщение в формат ChatMessage
      const transformedMessage = {
        id: message.id,
        content: message.content,
        authorId: message.authorId,
        author: {
          id: message.author.id,
          name: message.author.name || 'Пользователь',
          image: message.author.image,
        },
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.content,
              authorName: message.replyTo.author.name || 'Пользователь',
            }
          : null,
        reactions: [], // Новые сообщения не имеют реакций
        editedAt: null,
        createdAt: message.createdAt,
      }

      // Отправляем сообщение всем участникам комнаты
      const roomName = `chat:${chatId}`
      // console.warn(`[chat-handler] Broadcasting new_message to room: ${roomName}`)
      // console.warn(`[chat-handler] Message content:`, transformedMessage)
      io.to(roomName).emit('new_message', transformedMessage)

      // Уведомляем всех участников об обновлении списка чатов
      updatedChat.participants.forEach((p) => {
        io.to(`user:${p.userId}`).emit('chat_list_update', {
          chatId,
          lastMessage: transformedMessage,
          lastMessageAt: updatedChat.lastMessageAt,
          unreadIncrement: p.userId !== userId ? 1 : 0, // Увеличиваем счетчик для всех, кроме автора
        })
      })

      // console.warn(`Message sent in chat ${chatId} by ${userName}`)
    } catch (error) {
      console.error('Error sending message:', error)
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Ошибка отправки сообщения',
      })
    }
  })

  // Редактирование сообщения
  socket.on('edit_message', async (data) => {
    try {
      const { chatId, messageId, content } = EditMessageSchema.parse(data)

      const message = await prisma.chatMessage.findUnique({
        where: { id: messageId },
        include: {
          author: true,
          replyTo: { include: { author: true } },
          reactions: true,
        },
      })

      if (!message) {
        throw new Error('Message not found')
      }

      if (message.authorId !== userId) {
        throw new Error('Permission denied')
      }

      const updatedMessage = await prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          content,
          editedAt: new Date(),
        },
        include: {
          author: true,
          replyTo: { include: { author: true } },
          reactions: true,
        },
      })

      // Трансформируем
      const transformedMessage = {
        id: updatedMessage.id,
        content: updatedMessage.content,
        authorId: updatedMessage.authorId,
        author: {
          id: updatedMessage.author.id,
          name: updatedMessage.author.name || 'Пользователь',
          image: updatedMessage.author.image,
        },
        replyTo: updatedMessage.replyTo
          ? {
              id: updatedMessage.replyTo.id,
              content: updatedMessage.replyTo.content,
              authorName: updatedMessage.replyTo.author.name || 'Пользователь',
            }
          : null,
        reactions: updatedMessage.reactions.map((r) => ({
          emoji: r.emoji,
          count: 1, // Simple count for now, aggregation logic might be needed if complex
          hasReacted: r.userId === userId,
          userId: r.userId,
        })),
        editedAt: updatedMessage.editedAt,
        createdAt: updatedMessage.createdAt,
      }

      // 1. Notify room
      io.to(`chat:${chatId}`).emit('message_updated', transformedMessage)

      // 2. Notify list (in case it is the last message)
      // Check if it is the last message
      const chat = await prisma.chat.findUnique({
        where: { id: chatId },
        include: {
          participants: { where: { leftAt: null } },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (chat && chat.messages[0]?.id === messageId) {
        chat.participants.forEach((p) => {
          io.to(`user:${p.userId}`).emit('chat_list_update', {
            chatId,
            lastMessage: transformedMessage,
            lastMessageAt: chat.lastMessageAt,
            unreadIncrement: 0,
          })
        })
      }
    } catch (error) {
      console.error('Error editing message:', error)
      socket.emit('error', {
        message: error instanceof Error ? error.message : 'Ошибка редактирования',
      })
    }
  })
}
