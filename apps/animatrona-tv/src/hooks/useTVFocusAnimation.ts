/**
 * useTVFocusAnimation — плавная анимация фокуса для TV элементов
 *
 * Возвращает animated значения для scale и opacity границы,
 * а также обработчики onFocus/onBlur для привязки к Pressable.
 */

import { useRef } from 'react'
import { Animated } from 'react-native'

interface UseTVFocusAnimationOptions {
  /** Длительность анимации в ms (по умолчанию 200) */
  duration?: number
  /** Масштаб при фокусе (по умолчанию 1.08) */
  focusScale?: number
}

/** Хук для плавной анимации фокуса */
export function useTVFocusAnimation({ duration = 200, focusScale = 1.08 }: UseTVFocusAnimationOptions = {}) {
  const scale = useRef(new Animated.Value(1)).current
  const focusOpacity = useRef(new Animated.Value(0)).current

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
