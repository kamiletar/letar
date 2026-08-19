/**
 * TVTrackSelector — модальное окно выбора аудио/субтитров для TV
 *
 * D-Pad навигация по списку дорожек
 */

import React from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import type { TVPressableState } from '@/types/react-native'

import type { AudioTrack, SubtitleTrack } from '@letar/animatrona-shared'

/** Общий тип для дорожки */
export interface TrackItem {
  id: string
  label: string
  isSelected: boolean
}

interface TVTrackSelectorProps {
  /** Видимость модального окна */
  visible: boolean
  /** Заголовок (например "Аудио" или "Субтитры") */
  title: string
  /** Список дорожек */
  tracks: TrackItem[]
  /** Callback при выборе дорожки */
  onSelect: (id: string | null) => void
  /** Callback при закрытии */
  onClose: () => void
  /** Показывать опцию "Выключить" (для субтитров) */
  showDisableOption?: boolean
}

/** Модальное окно выбора дорожки */
export function TVTrackSelector({
  visible,
  title,
  tracks,
  onSelect,
  onClose,
  showDisableOption = false,
}: TVTrackSelectorProps): React.JSX.Element {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Заголовок */}
          <Text style={styles.title}>{title}</Text>

          {/* Список дорожек */}
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item, index }) => (
              <Pressable
                style={({ focused }: TVPressableState) => [
                  styles.trackItem,
                  item.isSelected && styles.trackItemSelected,
                  focused && styles.trackItemFocused,
                ]}
                onPress={() => onSelect(item.id)}
                hasTVPreferredFocus={item.isSelected || index === 0}
              >
                <Text style={[styles.trackLabel, item.isSelected && styles.trackLabelSelected]}>{item.label}</Text>
                {item.isSelected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            )}
            ListFooterComponent={showDisableOption
              ? (
                <Pressable
                  style={(
                    { focused }: TVPressableState,
                  ) => [styles.trackItem, styles.disableItem, focused && styles.trackItemFocused]}
                  onPress={() => onSelect(null)}
                >
                  <Text style={styles.trackLabel}>Выключить</Text>
                </Pressable>
              )
              : undefined}
          />

          {/* Кнопка закрытия */}
          <Pressable
            style={({ focused }: TVPressableState) => [styles.closeButton, focused && styles.closeButtonFocused]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Закрыть</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

/** Хелпер для преобразования AudioTrack в TrackItem */
export function audioTracksToItems(tracks: AudioTrack[], selectedId: string | null): TrackItem[] {
  return tracks.map((track) => ({
    id: track.id,
    label: track.name || track.title || `${track.language} (${track.codec})`,
    isSelected: track.id === selectedId,
  }))
}

/** Хелпер для преобразования SubtitleTrack в TrackItem */
export function subtitleTracksToItems(tracks: SubtitleTrack[], selectedId: string | null): TrackItem[] {
  return tracks.map((track) => ({
    id: track.id,
    label: track.name || track.title || `${track.language} (${track.format.toUpperCase()})`,
    isSelected: track.id === selectedId,
  }))
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 24,
    padding: 24,
    minWidth: 400,
    maxWidth: 600,
    maxHeight: '80%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    maxHeight: 400,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  trackItemSelected: {
    backgroundColor: '#7c3aed',
  },
  trackItemFocused: {
    borderColor: '#fff',
    backgroundColor: '#3a3a3a',
    transform: [{ scale: 1.03 }],
    elevation: 6,
  },
  trackLabel: {
    fontSize: 18,
    color: '#fff',
  },
  trackLabelSelected: {
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  disableItem: {
    backgroundColor: '#333',
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'transparent',
  },
  closeButtonFocused: {
    borderColor: '#fff',
    backgroundColor: '#444',
    transform: [{ scale: 1.03 }],
    elevation: 6,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#fff',
  },
})
