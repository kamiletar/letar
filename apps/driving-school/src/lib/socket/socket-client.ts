import { io, type Socket } from 'socket.io-client'

// Singleton Socket.IO клиент
let socket: Socket | null = null

/**
 * Получить или создать Socket.IO клиент (singleton)
 * @returns Socket.IO instance
 */
export function getSocket(): Socket {
  if (!socket) {
    // Socket.IO работает на отдельном порту (3004)
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3004'

    socket = io(url, {
      path: '/socket.io',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true, // Важно для отправки cookies (Auth.js session)
    })

    console.warn('Socket.IO client created')
  }

  return socket
}

/**
 * Отключить и очистить Socket.IO клиент
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    console.warn('Socket.IO client disconnected')
  }
}
