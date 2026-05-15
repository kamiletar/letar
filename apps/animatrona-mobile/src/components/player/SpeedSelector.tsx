/**
 * SpeedSelector — выбор скорости воспроизведения
 */

import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { Haptics } from '@/services/haptics'

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

interface SpeedSelectorProps {
  visible: boolean
  onClose: () => void
  currentSpeed: number
  onSelectSpeed: (speed: number) => void
}

export function SpeedSelector({ visible, onClose, currentSpeed, onSelectSpeed }: SpeedSelectorProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <Text style={styles.title}>Скорость воспроизведения</Text>

          <View style={styles.options}>
            {SPEED_OPTIONS.map((speed) => (
              <TouchableOpacity
                key={speed}
                style={[styles.option, currentSpeed === speed && styles.optionSelected]}
                onPress={() => {
                  Haptics.light()
                  onSelectSpeed(speed)
                  onClose()
                }}
              >
                <Text style={[styles.optionText, currentSpeed === speed && styles.optionTextSelected]}>
                  {speed === 1.0 ? 'Обычная' : `${speed}x`}
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
    minWidth: 200,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  options: {
    gap: 4,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2D3748',
  },
  optionSelected: {
    backgroundColor: '#553C9A',
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
})
