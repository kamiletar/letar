/**
 * Friends IPC handlers
 *
 * Handlers для работы с друзьями и запросами в друзья.
 * Использует SQLite (FriendRequestsSync) + Kubo PubSub для синхронизации.
 */

import { getFriendRequestsSync } from '../services/sync'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует Friends IPC handlers
 */
export function registerFriendsHandlers(): void {
  const friendRequestsSync = getFriendRequestsSync()

  // === Список друзей ===
  createHandler('friends:list', () => friendRequestsSync.getFriends())
  createHandler('friends:remove', (peerId: string) => friendRequestsSync.removeFriend(peerId))
  createHandler('friends:block', (peerId: string) => friendRequestsSync.blockUser(peerId))
  createHandler('friends:is-blocked', (peerId: string) => friendRequestsSync.isBlocked(peerId))

  // === Запросы в друзья ===
  createHandler('friend-request:send', (targetPeerId: string) => friendRequestsSync.sendRequest(targetPeerId))
  createHandler('friend-request:incoming', () => friendRequestsSync.getIncomingRequests())
  createHandler('friend-request:outgoing', () => friendRequestsSync.getOutgoingRequests())
  createHandler('friend-request:accept', (requestId: string) => friendRequestsSync.acceptRequest(requestId))
  createHandler('friend-request:reject', (requestId: string) => friendRequestsSync.rejectRequest(requestId))

  // === Подписки на события ===
  friendRequestsSync.on('request:received', (request) => broadcastToWindows('friend-request:received', request))
  friendRequestsSync.on('request:updated', (request) => broadcastToWindows('friend-request:updated', request))
  friendRequestsSync.on('friends:updated', (friends) => broadcastToWindows('friends:updated', friends))
}
