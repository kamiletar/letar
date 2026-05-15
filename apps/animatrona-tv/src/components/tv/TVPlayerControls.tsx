/**
 * TVPlayerControls — контролы плеера для TV
 *
 * Большие кнопки для D-Pad навигации
 */

import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { formatDuration } from '@letar/animatrona-shared'

interface TVPlayerControlsProps {
  /** Воспроизводится ли видео */
  isPlaying: boolean
  /** Текущее время в секундах */
  currentTime: number
  /** Длительность в секундах */
  duration: number
  /** Callback паузы/воспроизведения */
  onPlayPause: () => void
  /** Callback перемотки */
  onSeek: (position: number) => void
}

/** Контролы плеера */
export function TVPlayerControls({
  isPlaying,
  currentTime,
  duration,
  onPlayPause,
  onSeek,
}: TVPlayerControlsProps): React.JSX.Element {
  // Процент прогресса
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <View style={styles.container}>
      {/* Прогресс бар */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
          <View style={[styles.progressHandle, { left: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Время и кнопки */}
      <View style={styles.controlsRow}>
        {/* Текущее время */}
        <Text style={styles.timeText}>{formatDuration(currentTime)}</Text>

        {/* Кнопки управления */}
        <View style={styles.buttonsRow}>
          {/* -10 секунд */}
          <Pressable
            style={({ focused }) => [styles.controlButton, focused && styles.controlButtonFocused]}
            onPress={() => onSeek(currentTime - 10)}
          >
            <Text style={styles.controlButtonText}>-10</Text>
          </Pressable>

          {/* Play/Pause */}
          <Pressable
            style={({ focused }) => [styles.playButton, focused && styles.playButtonFocused]}
            onPress={onPlayPause}
            hasTVPreferredFocus
          >
            <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>

          {/* +10 секунд */}
          <Pressable
            style={({ focused }) => [styles.controlButton, focused && styles.controlButtonFocused]}
            onPress={() => onSeek(currentTime + 10)}
          >
            <Text style={styles.controlButtonText}>+10</Text>
          </Pressable>
        </View>

        {/* Оставшееся время */}
        <Text style={styles.timeText}>{formatDuration(duration)}</Text>
      </View>

      {/* Подсказки */}
      <View style={styles.hints}>
        <Text style={styles.hintText}>← → Перемотка • Enter Пауза • Back Назад</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    paddingBottom: 48,
  },

  // Прогресс бар
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 4,
  },
  progressHandle: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginLeft: -10,
  },

  // Контролы
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 20,
    color: '#fff',
    fontVariant: ['tabular-nums'],
    width: 80,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },

  // Кнопки перемотки
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
  },
  controlButtonFocused: {
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    transform: [{ scale: 1.15 }],
    elevation: 8,
  },
  controlButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },

  // Кнопка Play/Pause
  playButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
  },
  playButtonFocused: {
    borderColor: '#fff',
    backgroundColor: '#8b5cf6',
    transform: [{ scale: 1.2 }],
    elevation: 12,
  },
  playButtonText: {
    fontSize: 32,
    color: '#fff',
  },

  // Подсказки
  hints: {
    marginTop: 24,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
  },
})
