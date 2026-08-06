/**
 * useWatchParty — React хук для Watch Party
 *
 * Предоставляет реактивный доступ к функциям совместного просмотра.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type {
  WatchPartyChatMessage,
  WatchPartyParticipant,
  WatchPartyPlaybackState,
  WatchPartyRoom,
} from '../../../shared/types/orbitdb'

export interface UseWatchPartyReturn {
  /** Текущий ID комнаты */
  currentRoomId: string | null
  /** Участники комнаты */
  participants: WatchPartyParticipant[]
  /** Состояние playback */
  playbackState: WatchPartyPlaybackState | null
  /** Сообщения чата */
  messages: WatchPartyChatMessage[]
  /** Загрузка */
  isLoading: boolean
  /** Ошибка */
  error: string | null
  /** Создать комнату */
  createRoom: (options: {
    name: string
    animeName: string
    episodeNumber: number
    filePath?: string
    contentCid?: string
    isPrivate?: boolean
    maxParticipants?: number
  }) => Promise<WatchPartyRoom | null>
  /** Присоединиться к комнате */
  joinRoom: (roomId: string) => Promise<boolean>
  /** Покинуть комнату */
  leaveRoom: () => Promise<boolean>
  /** Закрыть комнату (только хост) */
  closeRoom: () => Promise<boolean>
  /** Play */
  play: () => Promise<boolean>
  /** Pause */
  pause: () => Promise<boolean>
  /** Seek */
  seek: (position: number) => Promise<boolean>
  /** Отправить сообщение */
  sendMessage: (text: string) => Promise<WatchPartyChatMessage | null>
  /** Отправить реакцию */
  sendReaction: (reaction: string) => Promise<WatchPartyChatMessage | null>
}

export function useWatchParty(): UseWatchPartyReturn {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<WatchPartyParticipant[]>([])
  const [playbackState, setPlaybackState] = useState<WatchPartyPlaybackState | null>(null)
  const [messages, setMessages] = useState<WatchPartyChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Создать комнату
  const createRoom = useCallback(
    async (options: {
      name: string
      animeName: string
      episodeNumber: number
      filePath?: string
      contentCid?: string
      isPrivate?: boolean
      maxParticipants?: number
    }): Promise<WatchPartyRoom | null> => {
      if (!window.electronAPI?.watchParty) {
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const result = await window.electronAPI.watchParty.create(options)
        if (result.success && result.data) {
          setCurrentRoomId(result.data.id)
          return result.data
        }
        setError(result.error || 'Не удалось создать комнату')
        return null
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  // Присоединиться к комнате
  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.watchParty.join(roomId)
      if (result.success) {
        setCurrentRoomId(roomId)
        return true
      }
      setError(result.error || 'Не удалось присоединиться')
      return false
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Покинуть комнату
  const leaveRoom = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    try {
      const result = await window.electronAPI.watchParty.leave()
      if (result.success) {
        setCurrentRoomId(null)
        setParticipants([])
        setPlaybackState(null)
        setMessages([])
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Закрыть комнату
  const closeRoom = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    try {
      const result = await window.electronAPI.watchParty.close()
      if (result.success) {
        setCurrentRoomId(null)
        setParticipants([])
        setPlaybackState(null)
        setMessages([])
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Play
  const play = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    try {
      const result = await window.electronAPI.watchParty.play()
      return result.success
    } catch {
      return false
    }
  }, [])

  // Pause
  const pause = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    try {
      const result = await window.electronAPI.watchParty.pause()
      return result.success
    } catch {
      return false
    }
  }, [])

  // Seek
  const seek = useCallback(async (position: number): Promise<boolean> => {
    if (!window.electronAPI?.watchParty) {
      return false
    }

    try {
      const result = await window.electronAPI.watchParty.seek(position)
      return result.success
    } catch {
      return false
    }
  }, [])

  // Отправить сообщение
  const sendMessage = useCallback(async (text: string): Promise<WatchPartyChatMessage | null> => {
    if (!window.electronAPI?.watchParty) {
      return null
    }

    try {
      const result = await window.electronAPI.watchParty.sendMessage(text)
      return result.success ? (result.data ?? null) : null
    } catch {
      return null
    }
  }, [])

  // Отправить реакцию
  const sendReaction = useCallback(async (reaction: string): Promise<WatchPartyChatMessage | null> => {
    if (!window.electronAPI?.watchParty) {
      return null
    }

    try {
      const result = await window.electronAPI.watchParty.sendReaction(reaction)
      return result.success ? (result.data ?? null) : null
    } catch {
      return null
    }
  }, [])

  // Загрузка начального состояния и подписки
  useEffect(() => {
    const loadState = async () => {
      if (!window.electronAPI?.watchParty) {
        return
      }

      // Получить текущую комнату
      const currentResult = await window.electronAPI.watchParty.getCurrent()
      if (currentResult.success && currentResult.data) {
        setCurrentRoomId(currentResult.data)

        // Загрузить участников
        const participantsResult = await window.electronAPI.watchParty.getParticipants()
        if (participantsResult.success && participantsResult.data) {
          setParticipants(participantsResult.data)
        }

        // Загрузить состояние playback
        const playbackResult = await window.electronAPI.watchParty.getPlaybackState()
        if (playbackResult.success && playbackResult.data) {
          setPlaybackState(playbackResult.data)
        }
      }
    }

    loadState()

    // Подписки на события
    let unsubPlayback: (() => void) | undefined
    let unsubParticipantJoined: (() => void) | undefined
    let unsubParticipantLeft: (() => void) | undefined
    let unsubMessage: (() => void) | undefined
    let unsubRoomClosed: (() => void) | undefined

    if (window.electronAPI?.watchParty) {
      // Обновление playback
      unsubPlayback = window.electronAPI.watchParty.onPlaybackUpdated(({ state }) => {
        setPlaybackState(state)
      })

      // Участник присоединился
      unsubParticipantJoined = window.electronAPI.watchParty.onParticipantJoined(({ participant }) => {
        setParticipants((prev) => [...prev.filter((p) => p.peerId !== participant.peerId), participant])
      })

      // Участник покинул
      unsubParticipantLeft = window.electronAPI.watchParty.onParticipantLeft(({ peerId }) => {
        setParticipants((prev) => prev.filter((p) => p.peerId !== peerId))
      })

      // Сообщение чата
      unsubMessage = window.electronAPI.watchParty.onMessageReceived(({ message }) => {
        setMessages((prev) => [...prev, message])
      })

      // Комната закрыта
      unsubRoomClosed = window.electronAPI.watchParty.onRoomClosed(() => {
        setCurrentRoomId(null)
        setParticipants([])
        setPlaybackState(null)
        setMessages([])
      })
    }

    return () => {
      unsubPlayback?.()
      unsubParticipantJoined?.()
      unsubParticipantLeft?.()
      unsubMessage?.()
      unsubRoomClosed?.()
    }
  }, [])

  return {
    currentRoomId,
    participants,
    playbackState,
    messages,
    isLoading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    closeRoom,
    play,
    pause,
    seek,
    sendMessage,
    sendReaction,
  }
}
