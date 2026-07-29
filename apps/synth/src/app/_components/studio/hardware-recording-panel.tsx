'use client'

import type { AudioInputDevice } from '@/lib/audio/hardware-recorder'
import { Box, HStack, Text } from '@chakra-ui/react'
import type React from 'react'

interface HardwareRecordingPanelProps {
  devices: AudioInputDevice[]
  selectedDeviceId: string | null
  onSelectDevice: (deviceId: string) => void
  isRecording: boolean
  recordingUrl: string | null
  error: string | null
  onRefreshDevices: () => void
  onToggle: () => void
}

const btnStyle = (variant: 'default' | 'recording' = 'default'): React.CSSProperties => ({
  background: variant === 'recording' ? '#3A0808' : 'transparent',
  border: `1px solid ${variant === 'recording' ? '#e05555' : '#5a3a10'}`,
  borderRadius: '3px',
  color: variant === 'recording' ? '#ff8080' : '#D4AF37',
  cursor: 'pointer',
  fontSize: '10px',
  padding: '2px 8px',
  fontFamily: 'monospace',
  lineHeight: 1.4,
})

/**
 * Запись реального звука с внешнего аудиоустройства (например, SMK-37 PRO в режиме
 * USB-audio interface — там аппаратный DX7-движок пишется как обычный микрофон).
 * Независима от MIDI-подключения и от нашего собственного AudioContext.
 */
export function HardwareRecordingPanel({
  devices,
  selectedDeviceId,
  onSelectDevice,
  isRecording,
  recordingUrl,
  error,
  onRefreshDevices,
  onToggle,
}: HardwareRecordingPanelProps) {
  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.subtle" borderRadius="md" p={3}>
      <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase" mb={2}>
        Запись аппаратного звука
      </Text>
      <Text fontSize="9px" color="fg.subtle" mb={2}>
        Пишет то, что реально выходит из железа (например, встроенный DX7-движок SMK-37 через его USB-audio выход) — не
        то, что звучит в браузере.
      </Text>

      <HStack gap={2} flexWrap="wrap">
        {devices.length === 0
          ? (
            <button style={btnStyle()} onClick={onRefreshDevices}>
              Выбрать аудиовход
            </button>
          )
          : (
            <>
              <select
                value={selectedDeviceId ?? ''}
                onChange={(e) => onSelectDevice(e.target.value)}
                style={{
                  background: 'transparent',
                  border: '1px solid #5a3a10',
                  borderRadius: '3px',
                  color: '#D4AF37',
                  fontSize: '10px',
                  padding: '2px 6px',
                  fontFamily: 'monospace',
                  maxWidth: '220px',
                }}
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button style={btnStyle()} onClick={onRefreshDevices} title="Обновить список устройств">
                ⟳
              </button>
              <button style={btnStyle(isRecording ? 'recording' : 'default')} onClick={onToggle}>
                {isRecording ? '● стоп' : '● запись'}
              </button>
              {recordingUrl && !isRecording && (
                <a
                  href={recordingUrl}
                  download={`synth-hardware-${Date.now()}.webm`}
                  style={{ fontSize: '9px', color: '#7fd88f', letterSpacing: '0.04em' }}
                >
                  ↓ скачать запись
                </a>
              )}
            </>
          )}
        {error && (
          <Text fontSize="9px" color="red.400">
            ✗ {error}
          </Text>
        )}
      </HStack>
    </Box>
  )
}
