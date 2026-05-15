import { auth } from '@/lib/auth'
import type { Socket } from 'socket.io'

// Расширяем тип Socket для добавления пользовательских данных
declare module 'socket.io' {
  interface Socket {
    userId?: string
    userName?: string
  }
}

/**
 * Socket.IO middleware для аутентификации через Better Auth
 * Проверяет наличие валидной сессии и устанавливает userId и userName в socket
 */
export async function socketAuthMiddleware(socket: Socket, next: (err?: Error) => void) {
  try {
    const cookie = socket.request.headers.cookie

    if (!cookie) {
      console.error('[socket-auth] Unauthorized: No cookies found')
      return next(new Error('Unauthorized: No cookies'))
    }

    // Создаём заголовки для Better Auth
    const headers = new Headers()
    headers.set('cookie', cookie)

    // Получаем сессию через Better Auth API
    const session = await auth.api.getSession({ headers })

    if (session?.user?.id) {
      // Успешная аутентификация
      socket.userId = session.user.id
      socket.userName = session.user.name ?? 'Аноним'
      return next()
    }

    console.error('[socket-auth] Unauthorized: No valid session found for socket', socket.id)
    return next(new Error('Unauthorized: No valid session'))
  } catch (error) {
    console.error('[socket-auth] Error:', error)
    next(new Error('Authentication failed'))
  }
}
