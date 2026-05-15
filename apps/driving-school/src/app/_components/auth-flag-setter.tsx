'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'hasLoggedIn'

/**
 * Клиентский компонент для установки флага авторизации в localStorage
 * Используется для условной регистрации Service Worker
 */
export function AuthFlagSetter({ isAuthenticated }: { isAuthenticated: boolean }) {
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true')
    }
  }, [isAuthenticated])

  return null
}

/**
 * Проверить, был ли пользователь когда-либо авторизован
 * Для использования в клиентских компонентах
 */
export function hasUserLoggedIn(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  return localStorage.getItem(STORAGE_KEY) === 'true'
}
