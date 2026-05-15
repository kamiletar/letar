import { getAppUrl } from '@/lib/app-url'
import { handleChatEvents } from '@/lib/socket/chat-handler'
import { socketAuthMiddleware } from '@/lib/socket/middleware'
import { handlePresenceEvents } from '@/lib/socket/presence-handler'
import { handleTypingEvents } from '@/lib/socket/typing-handler'
import { createServer } from 'http'
import type { NextRequest } from 'next/server'
import { Server as ServerIO } from 'socket.io'

// Расширяем тип для хранения io instance
declare global {
  var socketIO: ServerIO | undefined
  var httpServerForSocket: ReturnType<typeof createServer> | undefined
}

/**
 * Очистка Socket.IO при HMR (Hot Module Replacement)
 * Предотвращает утечки памяти при перезагрузке dev-сервера
 */
function cleanupSocketIO() {
  if (global.socketIO) {
    console.warn('[Socket.IO] Очистка при HMR...')
    global.socketIO.close()
    global.socketIO = undefined
  }
  if (global.httpServerForSocket) {
    global.httpServerForSocket.close()
    global.httpServerForSocket = undefined
  }
}

// В development режиме очищаем при HMR
if (process.env.NODE_ENV === 'development') {
  // @ts-expect-error - Node.js HMR API
  if (module.hot) {
    // @ts-expect-error - Node.js HMR API
    module.hot.dispose(() => {
      cleanupSocketIO()
    })
  }
}

/**
 * Socket.IO API Route для инициализации WebSocket сервера
 * В Next.js 16 App Router создаём отдельный HTTP сервер для Socket.IO
 */
export async function GET(_req: NextRequest) {
  // Проверяем, уже ли инициализирован Socket.IO сервер
  if (global.socketIO) {
    return new Response('Socket.IO server already running', { status: 200 })
  }

  // Очищаем предыдущие instances при необходимости (для HMR)
  cleanupSocketIO()

  try {
    // Создаём отдельный HTTP сервер для Socket.IO
    // Это необходимо для Next.js 16 App Router
    const httpServer = createServer()
    const port = Number(process.env.SOCKET_PORT) || 3004 // Отдельный порт для Socket.IO

    // Создаём Socket.IO сервер
    const io = new ServerIO(httpServer, {
      path: '/socket.io',
      cors: {
        origin: getAppUrl(),
        credentials: true,
      },
    })

    // Применяем middleware аутентификации
    io.use(socketAuthMiddleware)

    // Обрабатываем подключения
    io.on('connection', (socket) => {
      console.warn(`Socket connected: ${socket.id} (User: ${socket.userName})`)

      // Подключаем обработчики событий
      handleChatEvents(socket, io)
      handleTypingEvents(socket, io)
      handlePresenceEvents(socket, io)

      // Обрабатываем отключение
      socket.on('disconnect', () => {
        console.warn(`Socket disconnected: ${socket.id}`)
      })
    })

    // Запускаем HTTP сервер
    httpServer.listen(port, () => {
      console.warn(`✅ Socket.IO server initialized on port ${port}`)
    })

    // Сохраняем instances глобально
    global.socketIO = io
    global.httpServerForSocket = httpServer

    return new Response(`Socket.IO server initialized on port ${port}`, { status: 200 })
  } catch (error) {
    console.error('Error initializing Socket.IO:', error)
    return new Response('Failed to initialize Socket.IO', { status: 500 })
  }
}
