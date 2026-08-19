/**
 * TVErrorScreen — полноэкранный экран ошибки/пустого состояния
 *
 * Повторяющийся паттерн: центрированное сообщение + одна-две кнопки
 * ("Повторить"/"Назад"/"Отключиться"). Кнопка повтора (если есть) забирает
 * hasTVPreferredFocus, иначе фокус достаётся вторичной кнопке.
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { focusableStyle } from '@/utils/tvStyles'

interface TVErrorScreenProps {
  /** Текст ошибки */
  message: string
  /** Необязательный заголовок над сообщением (например «Ошибка») */
  title?: string
  /** Цвет фона под конкретный экран */
  backgroundColor?: string
  /** Callback повтора — если передан, показывает основную кнопку с фокусом */
  onRetry?: () => void
  /** Подпись основной кнопки */
  retryLabel?: string
  /** Callback вторичной кнопки (обычно «Назад»/«Отключиться») */
  onSecondary?: () => void
  /** Подпись вторичной кнопки */
  secondaryLabel?: string
}

/** Экран ошибки */
export function TVErrorScreen({
  message,
  title,
  backgroundColor = '#000',
  onRetry,
  retryLabel = 'Повторить',
  onSecondary,
  secondaryLabel = 'Назад',
}: TVErrorScreenProps): React.JSX.Element {
  return (
    <View style={[styles.centerContainer, { backgroundColor }]}>
      {title && <Text style={styles.errorTitle}>{title}</Text>}
      <Text style={[styles.errorText, title && styles.errorTextMuted]}>{message}</Text>
      <View style={styles.errorButtons}>
        {onRetry && (
          <Pressable
            style={focusableStyle([styles.retryButton], styles.retryButtonFocused)}
            onPress={onRetry}
            hasTVPreferredFocus
          >
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
          </Pressable>
        )}
        {onSecondary && (
          <Pressable
            style={focusableStyle(
              [styles.retryButton, onRetry && styles.retryButtonSecondary],
              styles.retryButtonFocused,
            )}
            onPress={onSecondary}
            hasTVPreferredFocus={!onRetry}
          >
            <Text style={styles.retryButtonText}>{secondaryLabel}</Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  errorTextMuted: {
    color: '#888',
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  retryButton: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  retryButtonSecondary: {
    backgroundColor: '#333',
  },
  retryButtonFocused: {
    borderColor: '#fff',
    backgroundColor: '#8b5cf6',
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  retryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
})
