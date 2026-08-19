/**
 * ResumeOverlay — диалог "Продолжить просмотр?"
 *
 * Показывается при открытии эпизода, если есть сохранённая позиция.
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { focusableStyle } from '@/utils/tvStyles'
import { formatDuration } from '@letar/animatrona-shared'

interface ResumeOverlayProps {
  /** Сохранённая позиция в секундах */
  savedPosition: number
  /** Callback — продолжить с сохранённой позиции */
  onResume: () => void
  /** Callback — начать сначала */
  onStartFromBeginning: () => void
}

/** Диалог возобновления просмотра */
export function ResumeOverlay(
  { savedPosition, onResume, onStartFromBeginning }: ResumeOverlayProps,
): React.JSX.Element {
  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <Text style={styles.title}>Продолжить просмотр?</Text>
        <Text style={styles.text}>Вы остановились на {formatDuration(savedPosition)}</Text>
        <View style={styles.buttons}>
          <Pressable
            style={focusableStyle([styles.button], styles.buttonFocused)}
            onPress={onResume}
            hasTVPreferredFocus
          >
            <Text style={styles.buttonText}>Продолжить</Text>
          </Pressable>
          <Pressable
            style={focusableStyle([styles.button, styles.buttonSecondary], styles.buttonFocused)}
            onPress={onStartFromBeginning}
          >
            <Text style={styles.buttonText}>Сначала</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  text: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  buttonSecondary: {
    backgroundColor: '#333',
  },
  buttonFocused: {
    borderColor: '#fff',
    backgroundColor: '#8b5cf6',
    transform: [{ scale: 1.1 }],
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
})
