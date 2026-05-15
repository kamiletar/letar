/**
 * GestureLayer — прозрачный слой для обработки жестов плеера
 *
 * Отображает:
 * - Индикатор перемотки (seek)
 * - Индикатор громкости
 * - Индикатор яркости
 * - Ripple эффект double-tap
 * - Индикатор 2x скорости
 */

import React, { useEffect, useRef } from 'react'
import { Animated, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'

import { type GestureState, usePlayerGestures, type UsePlayerGesturesOptions } from '@/hooks/usePlayerGestures'

type GestureLayerProps = UsePlayerGesturesOptions

export function GestureLayer(props: GestureLayerProps) {
  const { gesture, gestureState } = usePlayerGestures(props)

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={styles.touchLayer}>
        {/* Индикаторы (внутри, не блокируют touches) */}
        <View style={styles.indicatorsLayer} pointerEvents="none">
          <GestureIndicators state={gestureState} />
          {gestureState.showDoubleTapRipple && <DoubleTapRipple side={gestureState.showDoubleTapRipple} />}
        </View>
      </Animated.View>
    </GestureDetector>
  )
}

/** Анимация появления/исчезновения через стандартный Animated API */
function FadeView({
  visible,
  children,
  style,
}: {
  visible: boolean
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start()
  }, [visible, opacity])

  if (!visible) {
    return null
  }

  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>
}

/** Анимация zoom-in + fade-out для ripple */
function ZoomFadeView({
  visible,
  children,
  style,
}: {
  visible: boolean
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
}) {
  const scale = useRef(new Animated.Value(0.3)).current
  const opacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      scale.setValue(0.3)
      opacity.setValue(1)
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ]).start()
    }
  }, [visible, scale, opacity])

  if (!visible) {
    return null
  }

  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>
}

/** Индикаторы жестов */
function GestureIndicators({ state }: { state: GestureState }) {
  return (
    <>
      {/* Индикатор перемотки */}
      <FadeView visible={state.showSeekIndicator} style={styles.indicatorContainer}>
        <View style={styles.indicatorBox}>
          <Text style={styles.indicatorText}>
            {state.seekDelta >= 0 ? '+' : ''}
            {state.seekDelta} сек
          </Text>
        </View>
      </FadeView>

      {/* Индикатор громкости */}
      <FadeView visible={state.showVolumeIndicator} style={[styles.indicatorContainer, styles.leftIndicator]}>
        <View style={styles.indicatorBox}>
          <Text style={styles.indicatorIcon}>🔊</Text>
          <View style={styles.levelBarContainer}>
            <View style={[styles.levelBar, { height: `${state.volumeLevel * 100}%` }]} />
          </View>
          <Text style={styles.indicatorPercent}>{Math.round(state.volumeLevel * 100)}%</Text>
        </View>
      </FadeView>

      {/* Индикатор яркости */}
      <FadeView visible={state.showBrightnessIndicator} style={[styles.indicatorContainer, styles.rightIndicator]}>
        <View style={styles.indicatorBox}>
          <Text style={styles.indicatorIcon}>☀️</Text>
          <View style={styles.levelBarContainer}>
            <View style={[styles.levelBar, { height: `${state.brightnessLevel * 100}%` }]} />
          </View>
          <Text style={styles.indicatorPercent}>{Math.round(state.brightnessLevel * 100)}%</Text>
        </View>
      </FadeView>

      {/* Индикатор 2x скорости (long press) */}
      <FadeView visible={state.showSpeedBoost} style={styles.speedBoostContainer}>
        <View style={styles.speedBoostBox}>
          <Text style={styles.speedBoostText}>2x</Text>
        </View>
      </FadeView>
    </>
  )
}

/** Ripple эффект двойного тапа */
function DoubleTapRipple({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'

  return (
    <ZoomFadeView visible={true} style={[styles.rippleContainer, isLeft ? styles.rippleLeft : styles.rippleRight]}>
      <View style={styles.rippleCircle}>
        <Text style={styles.rippleText}>{isLeft ? '-10' : '+10'}</Text>
      </View>
    </ZoomFadeView>
  )
}

const styles = StyleSheet.create({
  touchLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
  },
  indicatorsLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
  },
  indicatorContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -40 }, { translateY: -50 }],
  },
  speedBoostContainer: {
    position: 'absolute',
    top: 16,
    left: '50%',
    transform: [{ translateX: -30 }],
  },
  speedBoostBox: {
    backgroundColor: 'rgba(128, 90, 213, 0.9)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  speedBoostText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  leftIndicator: {
    left: '15%',
    transform: [{ translateX: -40 }, { translateY: -50 }],
  },
  rightIndicator: {
    left: '85%',
    transform: [{ translateX: -40 }, { translateY: -50 }],
  },
  indicatorBox: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  indicatorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  indicatorIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  indicatorPercent: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 4,
  },
  levelBarContainer: {
    width: 8,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  levelBar: {
    width: '100%',
    backgroundColor: '#805AD5',
    borderRadius: 4,
  },
  rippleContainer: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -40 }],
  },
  rippleLeft: {
    left: '15%',
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  rippleRight: {
    right: '15%',
    transform: [{ translateX: 40 }, { translateY: -40 }],
  },
  rippleCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(128, 90, 213, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rippleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
})
