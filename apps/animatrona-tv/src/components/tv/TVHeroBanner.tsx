/**
 * TVHeroBanner — баннер "Продолжить просмотр" для главного экрана
 *
 * Netflix-стиль: крупный постер с градиентом, название, прогресс
 */

import React from 'react'
import { Animated, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTVFocusAnimation } from '@/hooks/useTVFocusAnimation'
import { formatDuration } from '@letar/animatrona-shared'

interface TVHeroBannerProps {
  /** Название аниме */
  animeName: string
  /** Номер эпизода */
  episodeNumber: number
  /** Название эпизода */
  episodeName: string | null
  /** URL постера */
  posterUrl: string
  /** Текущее время просмотра (секунды) */
  currentTime: number
  /** Длительность эпизода (ms, null если неизвестна) */
  durationMs: number | null
  /** Callback при нажатии "Продолжить" */
  onContinue: () => void
  /** Начальный фокус */
  hasTVPreferredFocus?: boolean
}

/** Баннер продолжения просмотра */
export function TVHeroBanner({
  animeName,
  episodeNumber,
  episodeName,
  posterUrl,
  currentTime,
  durationMs,
  onContinue,
  hasTVPreferredFocus = false,
}: TVHeroBannerProps): React.JSX.Element {
  const { scale, focusOpacity, onFocus, onBlur } = useTVFocusAnimation({ focusScale: 1.02 })

  // Прогресс в процентах
  const progressPercent = durationMs ? Math.min((currentTime / (durationMs / 1000)) * 100, 100) : 0

  return (
    <View style={styles.container}>
      {/* Фоновое изображение с размытием */}
      <ImageBackground source={{ uri: posterUrl }} style={styles.background} resizeMode="cover" blurRadius={20}>
        {/* Gradient overlay */}
        <View style={styles.gradientOverlay}>
          <View style={styles.content}>
            {/* Постер */}
            <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />

            {/* Информация */}
            <View style={styles.info}>
              <Text style={styles.label}>Продолжить просмотр</Text>
              <Text style={styles.animeName} numberOfLines={2}>
                {animeName}
              </Text>
              <Text style={styles.episodeInfo}>
                Эпизод {episodeNumber}
                {episodeName ? ` — ${episodeName}` : ''}
              </Text>

              {/* Прогресс */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.progressText}>
                  {formatDuration(currentTime)}
                  {durationMs ? ` / ${formatDuration(durationMs / 1000)}` : ''}
                </Text>
              </View>

              {/* Кнопка */}
              <Animated.View style={{ transform: [{ scale }] }}>
                <Pressable
                  style={styles.continueButton}
                  onPress={onContinue}
                  hasTVPreferredFocus={hasTVPreferredFocus}
                  onFocus={onFocus}
                  onBlur={onBlur}
                >
                  <Text style={styles.continueButtonText}>▶ Продолжить</Text>
                </Pressable>
                {/* Анимированная граница фокуса */}
                <Animated.View style={[styles.buttonFocusBorder, { opacity: focusOpacity }]} pointerEvents="none" />
              </Animated.View>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    marginBottom: 32,
    overflow: 'hidden',
  },
  background: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poster: {
    width: 140,
    height: 210,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  info: {
    flex: 1,
    marginLeft: 32,
  },
  label: {
    fontSize: 16,
    color: '#7c3aed',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  animeName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 40,
  },
  episodeInfo: {
    fontSize: 20,
    color: '#aaa',
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 16,
    maxWidth: 400,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 16,
    color: '#888',
    marginTop: 6,
  },
  continueButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  buttonFocusBorder: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#fff',
    alignSelf: 'flex-start',
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
})
