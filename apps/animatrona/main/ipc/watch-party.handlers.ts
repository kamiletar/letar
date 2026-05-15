/**
 * Watch Party IPC handlers
 *
 * Handlers для Watch Party комнат и синхронизации playback.
 * Использует Kubo PubSub для real-time синхронизации.
 */

import { getWatchPartySync } from '../services/sync'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует Watch Party IPC handlers
 */
export function registerWatchPartyHandlers(): void {
  const watchPartySync = getWatchPartySync()

  // === Комнаты ===
  createHandler(
    'watch-party:create',
    (options: {
      name: string
      animeName: string
      episodeNumber: number
      filePath?: string
      contentCid?: string
      isPrivate?: boolean
      maxParticipants?: number
    }) => watchPartySync.createRoom(options)
  )

  createHandler('watch-party:join', (roomId: string) => watchPartySync.joinRoom(roomId))
  createHandler('watch-party:leave', () => watchPartySync.leaveRoom())
  createHandler('watch-party:close', () => watchPartySync.closeRoom())
  createHandler('watch-party:getCurrent', () => watchPartySync.getCurrentRoom())
  createHandler('watch-party:getRoomInfo', () => watchPartySync.getCurrentRoomInfo())
  createHandler('watch-party:getParticipants', () => watchPartySync.getParticipants())
  createHandler('watch-party:getPlaybackState', () => watchPartySync.getPlaybackState())

  // === Playback ===
  createHandler('watch-party:play', () => watchPartySync.updatePlayback('play'))
  createHandler('watch-party:pause', () => watchPartySync.updatePlayback('pause'))
  createHandler('watch-party:seek', (position: number) => watchPartySync.updatePlayback('seek', position))

  // === Chat ===
  createHandler('watch-party:sendMessage', (text: string) => watchPartySync.sendMessage(text))
  createHandler('watch-party:sendReaction', (reaction: string) => watchPartySync.sendReaction(reaction))

  // === События ===
  watchPartySync.on('playback:updated', (roomId, state) =>
    broadcastToWindows('watch-party:playbackUpdated', { roomId, state })
  )
  watchPartySync.on('participant:joined', (roomId, participant) =>
    broadcastToWindows('watch-party:participantJoined', { roomId, participant })
  )
  watchPartySync.on('participant:left', (roomId, peerId) =>
    broadcastToWindows('watch-party:participantLeft', { roomId, peerId })
  )
  watchPartySync.on('message:received', (roomId, message) =>
    broadcastToWindows('watch-party:messageReceived', { roomId, message })
  )
  watchPartySync.on('room:closed', (roomId) => broadcastToWindows('watch-party:roomClosed', { roomId }))
}
