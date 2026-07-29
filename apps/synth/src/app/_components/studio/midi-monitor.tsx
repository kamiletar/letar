'use client'

import { Box, Text } from '@chakra-ui/react'
import { outlineButtonStyle } from './button-style'
import type { MidiMonitorEntry } from './use-midi-monitor'

interface MidiMonitorProps {
  open: boolean
  entries: MidiMonitorEntry[]
  onToggle: () => void
  onClear: () => void
}

// Диагностическая панель: показывает сырые входящие MIDI-сообщения как есть, без нашей
// интерпретации. Нужна, чтобы разобраться, шлют ли недокументированные кнопки устройства
// (ARP/NOTE REPEAT/SCALE/CHORD/GLOBE/BT/PATCH/PARA/FX/SEQ и т.п.) что-то на хост вообще.
export function MidiMonitor({ open, entries, onToggle, onClear }: MidiMonitorProps) {
  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.subtle" borderRadius="md" p={2}>
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <button
          style={outlineButtonStyle(open ? 'active' : 'default', { padding: '2px 8px', monospace: true })}
          onClick={onToggle}
        >
          {open ? '▾ MIDI монитор' : '▸ MIDI монитор'}
        </button>
        <Text fontSize="9px" color="fg.subtle">
          сырые входящие сообщения — жми кнопки на железе и смотри, что придёт
        </Text>
        {open && entries.length > 0 && (
          <button style={outlineButtonStyle('default', { padding: '2px 8px' })} onClick={onClear}>
            очистить
          </button>
        )}
      </Box>

      {open && (
        <Box mt={2} maxH="180px" overflowY="auto" display="flex" flexDir="column" gap="2px">
          {entries.length === 0 && (
            <Text fontSize="9px" color="fg.subtle" fontFamily="mono">
              пока тихо — нажми что-нибудь на устройстве
            </Text>
          )}
          {entries.map((e) => (
            <Text key={e.id} fontSize="9px" fontFamily="mono" color="fg.muted" whiteSpace="pre">
              {e.time} {e.channel !== null ? `ch${e.channel}` : '    '} {e.type} — {e.hex}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  )
}
