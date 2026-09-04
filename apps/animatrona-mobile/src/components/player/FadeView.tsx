/**
 * FadeView — компонент с fade-анимацией появления/исчезновения
 *
 * Использует стандартный Animated из React Native (не Reanimated)
 * для избежания конфликтов с PanResponder.
 */

import { useEffect, useState } from 'react'
import { Animated, type StyleProp, StyleSheet, type ViewStyle } from 'react-native'

interface FadeViewProps {
  visible: boolean
  duration?: number
  style?: StyleProp<ViewStyle>
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only'
  children: React.ReactNode
}

export function FadeView({ visible, duration = 200, style, pointerEvents = 'auto', children }: FadeViewProps) {
  // useState вместо useRef(...).current — Animated.Value не меняет идентичность между рендерами,
  // но лениво инициализированное состояние не триггерит правило react(refs)
  const [opacity] = useState(() => new Animated.Value(visible ? 1 : 0))
  const [shouldRender, setShouldRender] = useState(visible)

  // Легитимная синхронизация с Animated (внешняя система)
  useEffect(() => {
    if (visible) {
      // Показываем - сначала рендерим, потом анимируем
      // oxlint-disable-next-line react/set-state-in-effect -- запуск Animated.timing, не производное значение
      setShouldRender(true)
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start()
    } else {
      // Скрываем - анимируем, потом убираем из рендера
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShouldRender(false)
        }
      })
    }
  }, [visible, duration, opacity])

  if (!shouldRender) {
    return null
  }

  const effectivePointerEvents = visible ? pointerEvents : 'none'

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style, { opacity }]} pointerEvents={effectivePointerEvents}>
      {children}
    </Animated.View>
  )
}

export default FadeView
