/**
 * GradientOverlay — плавный SVG градиент для header/bottom контролов
 *
 * Использует react-native-svg вместо многослойных View с opacity
 * для настоящего плавного перехода без видимых полос
 */

import { StyleSheet, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'

interface GradientOverlayProps {
  /** 'top' = чёрный сверху → прозрачный снизу, 'bottom' = наоборот */
  position: 'top' | 'bottom'
}

export function GradientOverlay({ position }: GradientOverlayProps) {
  const isTop = position === 'top'

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={`grad-${position}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="black" stopOpacity={isTop ? 0.75 : 0} />
            <Stop offset="0.5" stopColor="black" stopOpacity={isTop ? 0.25 : 0.25} />
            <Stop offset="1" stopColor="black" stopOpacity={isTop ? 0 : 0.75} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#grad-${position})`} />
      </Svg>
    </View>
  )
}
