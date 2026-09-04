/**
 * useTVFocusAnimation — плавная анимация фокуса для TV элементов
 *
 * Возвращает animated значения для scale и opacity границы,
 * а также обработчики onFocus/onBlur для привязки к Pressable.
 */

import { useState } from 'react'
import { Animated } from 'react-native'

interface UseTVFocusAnimationOptions {
  /** Длительность анимации в ms (по умолчанию 200) */
  duration?: number
  /** Масштаб при фокусе (по умолчанию 1.08) */
  focusScale?: number
}

/** Хук для плавной анимации фокуса */
export function useTVFocusAnimation({ duration = 200, focusScale = 1.08 }: UseTVFocusAnimationOptions = {}) {
  // useState с ленивым инициализатором вместо useRef — гарантированно стабильное
  // значение на весь жизненный цикл компонента, без чтения `.current` в рендере
  // (react(refs) запрещает доступ к ref во время рендера)
  const [scale] = useState(() => new Animated.Value(1))
  const [focusOpacity] = useState(() => new Animated.Value(0))

  const onFocus = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focusScale,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(focusOpacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const onBlur = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
      }),
      Animated.timing(focusOpacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }),
    ]).start()
  }

  return { scale, focusOpacity, onFocus, onBlur }
}
