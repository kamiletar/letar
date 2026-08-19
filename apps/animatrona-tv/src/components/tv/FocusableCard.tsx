/**
 * FocusableCard — карточка с D-Pad фокусом для TV
 *
 * Поддерживает:
 * - Плавную анимацию фокуса (scale + glow)
 * - Правильный aspect ratio 2:3 для постеров
 * - Прогресс-бар просмотра
 * - Загрузку изображений
 */

import React, { useState } from 'react'
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { useTVFocusAnimation } from '@/hooks/useTVFocusAnimation'

interface FocusableCardProps {
  /** Заголовок карточки */
  title: string
  /** Подзаголовок (опционально) */
  subtitle?: string
  /** URL изображения */
  imageUrl?: string
  /** Callback при нажатии */
  onPress: () => void
  /** Начальный фокус */
  hasTVPreferredFocus?: boolean
  /** Прогресс просмотра (0-100) */
  progress?: number
}

/** Размер карточки для TV — 2:3 aspect ratio для постеров */
const CARD_WIDTH = 200
const IMAGE_HEIGHT = 280
const CARD_HEIGHT = 360

/** Фокусируемая карточка */
export function FocusableCard({
  title,
  subtitle,
  imageUrl,
  onPress,
  hasTVPreferredFocus = false,
  progress,
}: FocusableCardProps): React.JSX.Element {
  const [imageError, setImageError] = useState(false)
  const { scale, focusOpacity, onFocus, onBlur } = useTVFocusAnimation({ focusScale: 1.08 })

  return (
    <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
      <Pressable
        style={styles.card}
        onPress={onPress}
        hasTVPreferredFocus={hasTVPreferredFocus}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {/* Изображение */}
        <View style={styles.imageContainer}>
          {imageUrl && !imageError
            ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
                onError={() => setImageError(true)}
              />
            )
            : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.placeholderText}>{title.charAt(0)}</Text>
              </View>
            )}

          {/* Прогресс-бар просмотра */}
          {progress != null && progress > 0 && progress < 100 && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
          )}
        </View>

        {/* Текст */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </Pressable>

      {/* Анимированная граница при фокусе */}
      <Animated.View style={[styles.focusBorder, { opacity: focusOpacity }]} pointerEvents="none" />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  card: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  focusBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#7c3aed',
    elevation: 16,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    backgroundColor: '#2a2a2a',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#666',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
  },
  textContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
    lineHeight: 20,
  },
})
