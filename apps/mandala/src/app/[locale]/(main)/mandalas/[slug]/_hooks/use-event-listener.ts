'use client'

import { useEffect, useRef } from 'react'

/**
 * Универсальный хук для добавления event listener'ов с автоматическим cleanup.
 *
 * @example
 * // Простое использование
 * useEventListener(elementRef.current, 'click', handleClick)
 *
 * @example
 * // С опциями
 * useEventListener(window, 'scroll', handleScroll, { passive: true })
 *
 * @example
 * // Несколько событий на одном элементе
 * useEventListener(audioElement, 'play', () => setIsPlaying(true))
 * useEventListener(audioElement, 'pause', () => setIsPlaying(false))
 * useEventListener(audioElement, 'ended', handleEnded)
 */
export function useEventListener<K extends keyof HTMLElementEventMap>(
  target: HTMLElement | null | undefined,
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions
): void

export function useEventListener<K extends keyof WindowEventMap>(
  target: Window | null | undefined,
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  options?: AddEventListenerOptions
): void

export function useEventListener<K extends keyof DocumentEventMap>(
  target: Document | null | undefined,
  eventName: K,
  handler: (event: DocumentEventMap[K]) => void,
  options?: AddEventListenerOptions
): void

export function useEventListener(
  target: HTMLMediaElement | null | undefined,
  eventName: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions
): void

export function useEventListener(
  target: EventTarget | null | undefined,
  eventName: string,
  handler: (event: Event) => void,
  options?: AddEventListenerOptions
): void {
  // Сохраняем handler в ref, чтобы избежать пересоздания слушателя
  // при каждом изменении handler
  const savedHandler = useRef(handler)

  // Обновляем ref при изменении handler
  useEffect(() => {
    savedHandler.current = handler
  }, [handler])

  useEffect(() => {
    if (!target) {
      return
    }

    // Создаём обёртку, которая вызывает актуальный handler
    const eventHandler = (event: Event) => savedHandler.current(event)

    target.addEventListener(eventName, eventHandler, options)

    return () => {
      target.removeEventListener(eventName, eventHandler, options)
    }
    // Намеренно используем отдельные свойства options вместо объекта,
    // чтобы избежать ререндеров при изменении только ссылки
    // oxlint-disable-next-line eslint-plugin-react-hooks(exhaustive-deps)
  }, [target, eventName, options?.capture, options?.once, options?.passive])
}

/**
 * Хук для добавления нескольких event listener'ов на один элемент.
 * Более эффективен, чем несколько вызовов useEventListener.
 *
 * @example
 * useEventListeners(audioElement, {
 *   play: () => setIsPlaying(true),
 *   pause: () => setIsPlaying(false),
 *   timeupdate: handleTimeUpdate,
 *   ended: handleEnded,
 * })
 */
export function useEventListeners<T extends EventTarget>(
  target: T | null | undefined,
  handlers: Record<string, (event: Event) => void>,
  options?: AddEventListenerOptions
): void {
  // Сохраняем handlers в ref
  const savedHandlers = useRef(handlers)

  useEffect(() => {
    savedHandlers.current = handlers
  }, [handlers])

  useEffect(() => {
    if (!target) {
      return
    }

    // Создаём Map обёрток для каждого события
    const wrappedHandlers = new Map<string, (event: Event) => void>()

    for (const eventName of Object.keys(savedHandlers.current)) {
      const wrapper = (event: Event) => {
        const handler = savedHandlers.current[eventName]
        if (handler) {
          handler(event)
        }
      }
      wrappedHandlers.set(eventName, wrapper)
      target.addEventListener(eventName, wrapper, options)
    }

    return () => {
      for (const [eventName, wrapper] of wrappedHandlers.entries()) {
        target.removeEventListener(eventName, wrapper, options)
      }
    }
    // Намеренно используем отдельные свойства options вместо объекта,
    // чтобы избежать ререндеров при изменении только ссылки
    // oxlint-disable-next-line eslint-plugin-react-hooks(exhaustive-deps)
  }, [target, options?.capture, options?.once, options?.passive])
}
