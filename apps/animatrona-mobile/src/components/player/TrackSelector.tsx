/**
 * TrackSelector — модальное меню выбора аудио/субтитров
 *
 * Центрированный модал с двумя колонками для landscape
 */

import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useOrientation } from '@/hooks/useOrientation'
import { Haptics } from '@/services/haptics'
import type { AudioTrack, SubtitleTrack } from '@letar/animatrona-shared'

interface TrackSelectorProps {
  visible: boolean
  onClose: () => void
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrack[]
  selectedAudioId: string | null
  selectedSubtitleId: string | null
  onSelectAudio: (trackId: string | null) => void
  onSelectSubtitle: (trackId: string | null) => void
}

/** Маппинг языковых кодов в читаемые названия */
const LANGUAGE_NAMES: Record<string, string> = {
  rus: 'Русский',
  jpn: 'Японский',
  eng: 'Английский',
  chi: 'Китайский',
  kor: 'Корейский',
  fre: 'Французский',
  ger: 'Немецкий',
  spa: 'Испанский',
  ita: 'Итальянский',
  por: 'Португальский',
  ara: 'Арабский',
  hin: 'Хинди',
  und: 'Неизвестный',
}

function getLanguageName(code: string | null | undefined): string | null {
  if (!code) {
    return null
  }
  return LANGUAGE_NAMES[code.toLowerCase()] || code.toUpperCase()
}

export function TrackSelector({
  visible,
  onClose,
  audioTracks,
  subtitleTracks,
  selectedAudioId,
  selectedSubtitleId,
  onSelectAudio,
  onSelectSubtitle,
}: TrackSelectorProps) {
  const { isLandscape } = useOrientation()
  const hasAudio = audioTracks.length > 0
  const hasSubs = subtitleTracks.length > 0

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={[styles.container, isLandscape && styles.containerLandscape]} activeOpacity={1}>
          {/* Заголовок */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Аудио и субтитры</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Контент — две колонки в landscape, одна в portrait */}
          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={[styles.content, isLandscape && hasAudio && hasSubs && styles.contentLandscape]}
            showsVerticalScrollIndicator={false}
          >
            {/* Аудиодорожки */}
            {hasAudio && (
              <View style={[styles.section, isLandscape && hasSubs && styles.sectionColumn]}>
                <Text style={styles.sectionTitle}>Аудио</Text>
                {audioTracks.map((track) => {
                  const isSelected = selectedAudioId === track.id
                  const lang = getLanguageName(track.language)
                  return (
                    <TouchableOpacity
                      key={track.id}
                      style={[styles.trackItem, isSelected && styles.trackItemSelected]}
                      onPress={() => {
                        Haptics.light()
                        onSelectAudio(track.id)
                      }}
                    >
                      <View style={styles.trackInfo}>
                        <Text style={styles.trackName} numberOfLines={1}>
                          {track.name || track.title || 'Дорожка'}
                        </Text>
                        <View style={styles.trackMeta}>
                          {lang && <Text style={styles.trackLanguage}>{lang}</Text>}
                          {track.codec && (
                            <View style={styles.formatBadge}>
                              <Text style={styles.formatText}>{track.codec.toUpperCase()}</Text>
                            </View>
                          )}
                          {track.channels && (
                            <View style={styles.formatBadge}>
                              <Text style={styles.formatText}>{track.channels}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}

            {/* Субтитры */}
            {hasSubs && (
              <View style={[styles.section, isLandscape && hasAudio && styles.sectionColumn]}>
                <Text style={styles.sectionTitle}>Субтитры</Text>

                {/* Выключить */}
                <TouchableOpacity
                  style={[styles.trackItem, selectedSubtitleId === null && styles.trackItemSelected]}
                  onPress={() => {
                    Haptics.light()
                    onSelectSubtitle(null)
                  }}
                >
                  <Text style={styles.trackName}>Выкл</Text>
                  {selectedSubtitleId === null && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>

                {subtitleTracks.map((track) => {
                  const isSelected = selectedSubtitleId === track.id
                  const lang = getLanguageName(track.language)
                  return (
                    <TouchableOpacity
                      key={track.id}
                      style={[styles.trackItem, isSelected && styles.trackItemSelected]}
                      onPress={() => {
                        Haptics.light()
                        onSelectSubtitle(track.id)
                      }}
                    >
                      <View style={styles.trackInfo}>
                        <Text style={styles.trackName} numberOfLines={1}>
                          {track.name || track.title || 'Субтитры'}
                        </Text>
                        <View style={styles.trackMeta}>
                          {lang && <Text style={styles.trackLanguage}>{lang}</Text>}
                          <View style={styles.formatBadge}>
                            <Text style={styles.formatText}>{track.format.toUpperCase()}</Text>
                          </View>
                        </View>
                      </View>
                      {isSelected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    maxHeight: '85%',
    width: '90%',
    maxWidth: 500,
  },
  containerLandscape: {
    maxWidth: 700,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    fontSize: 20,
    color: '#A0AEC0',
  },
  scrollContent: {
    flexGrow: 0,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  contentLandscape: {
    flexDirection: 'row',
    gap: 16,
  },
  section: {},
  sectionColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#805AD5',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#2D3748',
  },
  trackItemSelected: {
    backgroundColor: '#553C9A',
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  trackMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  trackLanguage: {
    fontSize: 12,
    color: '#A0AEC0',
  },
  formatBadge: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  formatText: {
    fontSize: 10,
    color: '#718096',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#48BB78',
  },
})
