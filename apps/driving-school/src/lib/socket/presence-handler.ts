import type { Server as ServerIO, Socket } from 'socket.io'

// Хранилище активных подключений пользователей
// Key: UserId, Value: Set of SocketIds
const userConnections = new Map<string, Set<string>>()

export function handlePresenceEvents(socket: Socket, io: ServerIO) {
  const userId = socket.userId

  if (!userId) {
    return
  }

  // REGISTER CONNECTION
  // -------------------
  let connections = userConnections.get(userId)
  if (!connections) {
    connections = new Set()
    userConnections.set(userId, connections)
  }
  connections.add(socket.id)

  // Если это первое подключение пользователя, он становится онлайн
  if (connections.size === 1) {
    // Broadcast всем "user_online"
    io.emit('user_online', { userId })
  }

  // Событие для запроса статуса конкретных пользователей (bulk)
  // Используется клиентом при загрузке списка чатов или открытии чата
  socket.on('get_users_status', (userIds: string[]) => {
    const onlineUsers = userIds.filter((id) => userConnections.has(id))
    socket.emit('users_status', onlineUsers)
  })

  // HANDLE DISCONNECT
  // -----------------
  socket.on('disconnect', () => {
    const connections = userConnections.get(userId)
    if (connections) {
      connections.delete(socket.id)

      // Если подключений не осталось, пользователь становится офлайн
      if (connections.size === 0) {
        userConnections.delete(userId)
        io.emit('user_offline', { userId })
      }
    }
  })
}
