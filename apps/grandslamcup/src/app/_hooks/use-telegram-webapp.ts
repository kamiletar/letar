/**
 * Хук для определения Telegram Mini App окружения.
 *
 * Если страница открыта через Telegram WebApp кнопку,
 * вызывает ready() и expand() для корректного отображения.
 * Возвращает API для нативных Telegram-фич: MainButton, HapticFeedback, initData.
 *
 * @module use-telegram-webapp
 */

import { useEffect, useRef, useState } from 'react'

/** Параметры главной нативной кнопки Telegram */
interface MainButtonParams {
  text: string
  is_visible?: boolean
  is_active?: boolean
  color?: string
  text_color?: string
}

/** Главная нативная кнопка Telegram внизу экрана */
interface TelegramMainButton {
  text: string
  isVisible: boolean
  isActive: boolean
  isProgressVisible: boolean
  setText: (text: string) => void
  show: () => void
  hide: () => void
  enable: () => void
  disable: () => void
  showProgress: (leaveActive?: boolean) => void
  hideProgress: () => void
  setParams: (params: MainButtonParams) => void
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
}

/** Тактильная отдача (вибрация) на устройстве пользователя */
interface TelegramHapticFeedback {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

/** Глобальный тип Telegram WebApp (инжектится Telegram) */
interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  themeParams: {
    bg_color?: string
    text_color?: string
    hint_color?: string
    button_color?: string
    button_text_color?: string
  }
  colorScheme: 'light' | 'dark'
  initData: string
  initDataUnsafe: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string }
    auth_date?: number
    hash?: string
  }
  platform: string
  version: string
  MainButton: TelegramMainButton
  HapticFeedback: TelegramHapticFeedback
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

interface TelegramWebAppState {
  /** Открыта ли страница в Telegram Mini App */
  isTelegram: boolean
  /** Цветовая схема Telegram (light/dark) */
  colorScheme: 'light' | 'dark'
  /** Сырой initData (для отправки на сервер для HMAC валидации) */
  initData: string
  /** ID пользователя Telegram (если доступен) */
  telegramUserId: number | null
  /** Закрыть Mini App */
  close: () => void
  /** Тактильная отдача (no-op вне Telegram) */
  hapticImpact: (style?: 'light' | 'medium' | 'heavy') => void
  hapticNotification: (type: 'success' | 'error' | 'warning') => void
}

/** Определяет Telegram Mini App окружение и инициализирует его */
export function useTelegramWebApp(): TelegramWebAppState {
  const [isTelegram, setIsTelegram] = useState(false)
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>('light')
  const [initData, setInitData] = useState('')
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null)

  useEffect(() => {
    // telegram-web-app.js загружается через layout.tsx (beforeInteractive),
    // но всё равно подождём ready-state на случай задержки.
    const init = () => {
      const tg = window.Telegram?.WebApp
      if (!tg || !tg.initData) {
        return false
      }
      tg.ready()
      tg.expand()
      setIsTelegram(true)
      setColorScheme(tg.colorScheme)
      setInitData(tg.initData)
      setTelegramUserId(tg.initDataUnsafe?.user?.id ?? null)
      return true
    }

    if (init()) {
      return
    }
    // Попробуем ещё раз через короткое время — иногда window.Telegram доступен с задержкой
    const tid = window.setTimeout(init, 100)
    return () => window.clearTimeout(tid)
  }, [])

  return {
    isTelegram,
    colorScheme,
    initData,
    telegramUserId,
    close: () => window.Telegram?.WebApp?.close(),
    hapticImpact: (style = 'medium') => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style),
    hapticNotification: (type) => window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type),
  }
}

/**
 * Хук для управления нативной MainButton Telegram внизу экрана.
 *
 * Внутри Mini App показывает большую кнопку Telegram с указанным текстом и колбэком.
 * Вне Telegram — no-op (используется обычная HTML-кнопка).
 *
 * @example
 * ```tsx
 * useTelegramMainButton({
 *   text: 'Отправить оценку',
 *   visible: textScore !== null && deliveryScore !== null,
 *   loading: submitting,
 *   onClick: handleSubmit,
 * })
 * ```
 */
export function useTelegramMainButton(opts: {
  text: string
  visible: boolean
  loading?: boolean
  onClick: () => void
}) {
  const callbackRef = useRef(opts.onClick)
  callbackRef.current = opts.onClick

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (!tg || !tg.initData) {
      return
    }

    const handler = () => callbackRef.current()
    tg.MainButton.setText(opts.text)
    tg.MainButton.onClick(handler)

    if (opts.visible) {
      tg.MainButton.show()
    } else {
      tg.MainButton.hide()
    }

    if (opts.loading) {
      tg.MainButton.showProgress(true)
      tg.MainButton.disable()
    } else {
      tg.MainButton.hideProgress()
      tg.MainButton.enable()
    }

    return () => {
      tg.MainButton.offClick(handler)
      tg.MainButton.hide()
      tg.MainButton.hideProgress()
    }
  }, [opts.text, opts.visible, opts.loading])
}
