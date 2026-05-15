/**
 * LockOverlay — оверлей блокировки экрана
 *
 * Показывается когда экран заблокирован
 * Разблокировка: долгое удержание в центре экрана (2 сек)
 *
 * Использует react-native-gesture-handler для long press
 */

import { Lock } from 'lucide-react-native'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import Svg, { Circle } from 'react-native-svg'

import type { UseLockScreenResult } from '@/hooks/useLockScreen'

import { FadeView } from './FadeView'

interface LockOverlayProps {
  lockState: UseLockScreenResult
}

export function LockOverlay({ lockState }: LockOverlayProps) {
  const { isLocked, iconVisible, unlockGesture, unlockProgress } = lockState

  // Размер круга прогресса
  const progressSize = 120
  const strokeWidth = 4
  const radius = (progressSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <FadeView visible={isLocked} style={styles.container} pointerEvents={isLocked ? 'auto' : 'none'}>
      <GestureDetector gesture={unlockGesture}>
        <View style={styles.touchArea}>
          {/* Визуальные элементы скрываются по таймауту, touch-блокировка остаётся */}
          <FadeView visible={iconVisible} style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Затемнение */}
            <View style={styles.backdrop} />

            {/* Центральная зона с индикатором */}
            <View style={styles.centerZone}>
              {/* Круговой прогресс через SVG */}
              <View style={[styles.progressContainer, { width: progressSize, height: progressSize }]}>
                <Svg width={progressSize} height={progressSize} style={styles.svgProgress}>
                  {/* Фоновый круг */}
                  <Circle
                    cx={progressSize / 2}
                    cy={progressSize / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                  {/* Дуга прогресса */}
                  {unlockProgress > 0 && (
                    <Circle
                      cx={progressSize / 2}
                      cy={progressSize / 2}
                      r={radius}
                      stroke="#805AD5"
                      strokeWidth={strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={circumference * (1 - unlockProgress)}
                      transform={`rotate(-90, ${progressSize / 2}, ${progressSize / 2})`}
                    />
                  )}
                </Svg>

                {/* Иконка замка */}
                <View style={styles.iconContainer}>
                  <Lock size={32} color="#FFFFFF" />
                </View>
              </View>

              {/* Подсказка */}
              <Text style={styles.hintText}>{unlockProgress > 0 ? 'Держите...' : 'Удерживайте для разблокировки'}</Text>
            </View>
          </FadeView>
        </View>
      </GestureDetector>
    </FadeView>
  )
}

/** Кнопка блокировки для header */
interface LockButtonProps {
  isLocked: boolean
  onPress: () => void
}

export function LockButton({ isLocked, onPress }: LockButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.lockButton, isLocked && styles.lockButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.lockButtonText}>{isLocked ? '🔒' : '🔓'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
  },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  centerZone: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svgProgress: {
    position: 'absolute',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(45, 55, 72, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintText: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  // Для LockButton в header
  lockButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 55, 72, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockButtonActive: {
    backgroundColor: 'rgba(128, 90, 213, 0.8)',
  },
  lockButtonText: {
    fontSize: 18,
  },
})
