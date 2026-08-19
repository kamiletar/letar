import type { TVPressableState } from '@/types/react-native'
import type { StyleProp, ViewStyle } from 'react-native'

type StyleEntry = StyleProp<ViewStyle> | false | null | undefined

/**
 * Собирает style-callback для `Pressable` из базовых стилей и стиля фокуса —
 * убирает повтор `({ focused }: TVPressableState) => [...]` в каждом месте использования.
 * Стили комбинируются структурно (RN мёржит их через `flattenStyle`), поэтому типизация
 * через общий `ViewStyle`, а не через тип конкретного стиля из `styles.X` — набор полей у
 * базового и focused-стиля обычно разный (borderColor/scale только у focused).
 */
export function focusableStyle(
  base: StyleEntry[],
  focusedStyle: StyleEntry,
  after: StyleEntry[] = [],
): (state: TVPressableState) => StyleEntry[] {
  return ({ focused }) => [...base, focused && focusedStyle, ...after]
}
