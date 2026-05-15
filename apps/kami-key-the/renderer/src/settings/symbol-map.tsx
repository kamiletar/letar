/**
 * Карта символов — отображение текущих маппингов в моноширинном формате
 */

import { Box, Heading, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import type { KeymapConfig, KeyMapping } from '../../../src/types'
import { displayChar } from '../editor/keyboard-data'

/** Название клавиши по VK */
const VK_DISPLAY: Record<number, string> = {
  0x08: 'Bksp',
  0x0d: 'Enter',
  0x20: 'Space',
  0xbb: '=',
  0xbd: '-',
  0xbe: '.',
  0xdb: '[',
  0xdd: ']',
}

function vkName(vk: number): string {
  if (VK_DISPLAY[vk]) {
    return VK_DISPLAY[vk]
  }
  if (vk >= 0x41 && vk <= 0x5a) {
    return String.fromCharCode(vk)
  }
  return `0x${vk.toString(16)}`
}

function generateMapLines(config: KeymapConfig): string[] {
  const layout = config.layouts.find((l) => l.name === config.activeLayout) ?? config.layouts[0]
  if (!layout) {
    return ['Нет раскладок']
  }

  const lines: string[] = [`Раскладка: ${layout.name}`, '']

  lines.push('AltGr + клавиша:')
  for (const m of layout.mappings) {
    lines.push(`  ${vkName(m.vk).padEnd(6)}\u2192  ${displayChar(m.char)}  ${m.label}`)
  }

  const shifted = layout.mappings.filter((m: KeyMapping) => m.shiftChar != null)
  if (shifted.length > 0) {
    lines.push('')
    lines.push('AltGr + Shift:')
    for (const m of shifted) {
      // shiftChar гарантирован фильтром выше
      lines.push(`  ${vkName(m.vk).padEnd(6)}\u2192  ${displayChar(m.shiftChar as string)}  ${m.shiftLabel ?? ''}`)
    }
  }

  return lines
}

export function SymbolMap() {
  const [config, setConfig] = useState<KeymapConfig | null>(null)

  useEffect(() => {
    window.electronAPI.config.get().then(setConfig)
    return window.electronAPI.on.configChanged(setConfig)
  }, [])

  if (!config) {
    return null
  }

  const lines = generateMapLines(config)

  return (
    <Box bg="#222244" borderRadius="8px" p="4" border="1px solid #3a3a5a">
      <Heading as="h3" size="sm" mb="3" color="white">
        Карта символов
      </Heading>
      <Box fontFamily="'Consolas', monospace" fontSize="sm" whiteSpace="pre" overflowX="auto">
        {lines.map((line, i) => (
          <Text key={i} lineHeight="1.6">
            {line}
          </Text>
        ))}
      </Box>
    </Box>
  )
}
