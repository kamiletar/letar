/**
 * PlayerSettingsModal — модальное окно настроек плеера
 *
 * Содержит настройку размера шрифта субтитров.
 */

import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Haptics } from '@/services/haptics'
import { usePlayerSettingsStore } from '@/store/playerSettings'

const FONT_SCALE_OPTIONS = [
  { value: 0.75, label: 'Маленький' },
  { value: 1.0, label: 'Обычный' },
  { value: 1.25, label: 'Увеличенный' },
  { value: 1.5, label: 'Большой' },
  { value: 1.75, label: 'Огромный' },
]

interface PlayerSettingsModalProps {
  visible: boolean
  onClose: () => void
}

export function PlayerSettingsModal({ visible, onClose }: PlayerSettingsModalProps) {
  const subtitleFontScale = usePlayerSettingsStore((s) => s.subtitleFontScale)
  const setSubtitleFontScale = usePlayerSettingsStore((s) => s.setSubtitleFontScale)

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Настройки</Text>

          <Text style={styles.sectionTitle}>Размер субтитров</Text>
          <View style={styles.options}>
            {FONT_SCALE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.option, subtitleFontScale === option.value && styles.optionSelected]}
                onPress={() => {
                  Haptics.light()
                  setSubtitleFontScale(option.value)
                }}
              >
                <Text style={[styles.optionText, subtitleFontScale === option.value && styles.optionTextSelected]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionScale, subtitleFontScale === option.value && styles.optionTextSelected]}>
                  {option.value}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1A202C',
    borderRadius: 16,
    padding: 24,
    minWidth: 240,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A0AEC0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  options: {
    gap: 4,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2D3748',
  },
  optionSelected: {
    backgroundColor: '#553C9A',
  },
  optionText: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionScale: {
    fontSize: 13,
    color: '#A0AEC0',
  },
})
