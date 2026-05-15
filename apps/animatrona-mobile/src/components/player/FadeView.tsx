/**
 * FadeView — компонент с fade-анимацией появления/исчезновения
 *
 * Использует стандартный Animated из React Native (не Reanimated)
 * для избежания конфликтов с PanResponder.
 */

import { useEffect, useRef, useState } from 'react'
import { Animated, type StyleProp, StyleSheet, type ViewStyle } from 'react-native'

interface FadeViewProps {
  visible: boolean
  duration?: number
  style?: StyleProp<ViewStyle>
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only'
  children: React.ReactNode
}

export function FadeView({ visible, duration = 200, style, pointerEvents = 'auto', children }: FadeViewProps) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current
  const [shouldRender, setShouldRender] = useState(visible)

  useEffect(() => {
    if (visible) {
      // Показываем - сначала рендерим, потом анимируем
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
