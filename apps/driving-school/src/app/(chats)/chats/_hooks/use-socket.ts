'use client'

import { getSocket } from '@/lib/socket/socket-client'
import { useEffect, useState } from 'react'
import type { Socket } from 'socket.io-client'

/**
 * Хук для управления Socket.IO подключением
 * @returns Socket instance и статус подключения
 */
export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    let isMounted = true
    let cleanupFn: (() => void) | undefined

    const init = async () => {
      try {
        await fetch('/api/socket')
      } catch (error) {
        console.error('Error initializing Socket.IO server:', error)
      }

      if (!isMounted) {
        return
      }

      const socketInstance = getSocket()
      setSocket(socketInstance)

      // Инициализируем статус
      if (socketInstance.connected) {
        setIsConnected(true)
      } else {
        // Если не подключен, но autoConnect: true (по умолчанию), он должен пытаться
        if (!socketInstance.active) {
          socketInstance.connect()
        }
      }

      const onConnect = () => {
        if (isMounted) {
          setIsConnected(true)
        }
      }

      const onDisconnect = () => {
        if (isMounted) {
          setIsConnected(false)
        }
      }

      const onConnectError = (err: Error) => {
        console.error('Socket connection error:', err)
        if (isMounted) {
          setIsConnected(false)
        }
      }

      // Проверяем наличие listeners перед добавлением (предотвращение дублирования при ремаунтах)
      // Socket.IO hasListeners() возвращает true если уже есть обработчики для события
      if (!socketInstance.hasListeners('connect')) {
        socketInstance.on('connect', onConnect)
      }
      if (!socketInstance.hasListeners('disconnect')) {
        socketInstance.on('disconnect', onDisconnect)
      }
      if (!socketInstance.hasListeners('connect_error')) {
        socketInstance.on('connect_error', onConnectError)
      }

      cleanupFn = () => {
        socketInstance.off('connect', onConnect)
        socketInstance.off('disconnect', onDisconnect)
        socketInstance.off('connect_error', onConnectError)
      }
    }

    init()

    return () => {
      isMounted = false
      if (cleanupFn) {
        cleanupFn()
      }
    }
  }, [])

  return { socket, isConnected }
}
