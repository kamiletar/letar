/**
 * Прямой ввод символа или Unicode-кода (U+XXXX)
 *
 * Принимает:
 * - Hex-код: U+20BD, 20BD, u+00A9
 * - Символ напрямую: ₽, ©, →
 */

import { Box, Button, Flex, Input, Text } from '@chakra-ui/react'
import { useState } from 'react'

interface DirectInputProps {
  onAssign: (char: string, name: string, slot: 'char' | 'shiftChar') => void
  keyLabel: string
}

/** Разобрать ввод: hex-код или прямой символ */
function parseInput(value: string): { char: string; label: string } | null {
  if (!value.trim()) {
    return null
  }

  // Попытка разобрать как hex-код (U+XXXX, u+XXXX, 20BD)
  const hexMatch = value.match(/^[Uu]\+?([0-9A-Fa-f]{1,6})$/) || value.match(/^([0-9A-Fa-f]{2,6})$/)
  if (hexMatch) {
    const cp = parseInt(hexMatch[1], 16)
    if (cp >= 0x20 && cp <= 0x10ffff) {
      try {
        const ch = String.fromCodePoint(cp)
        return { char: ch, label: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0') }
      } catch {
        return null
      }
    }
  }

  // Прямой символ (1 графема)
  const chars = [...value.trim()]
  if (chars.length === 1) {
    const ch = chars[0]
    const cp = ch.codePointAt(0) ?? 0
    if (cp >= 0x20) {
      return { char: ch, label: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0') }
    }
  }

  return null
}

export function DirectInput({ onAssign, keyLabel }: DirectInputProps) {
  const [value, setValue] = useState('')

  const parsed = parseInput(value)

  const assign = (slot: 'char' | 'shiftChar') => {
    if (!parsed) {
      return
    }
    onAssign(parsed.char, parsed.label, slot)
  }

  return (
    <Box mt="3" pt="3" borderTop="1px solid #3a3a5a">
      <Text color="#666" fontSize="xs" mb="1">
        Или введите символ или Unicode-код:
      </Text>
      <Flex align="center" gap="2">
        <Input
          w="110px"
          placeholder="₽ или U+20BD"
          maxLength={7}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          bg="#1a1a2e"
          border="1px solid #3a3a5a"
          color="white"
          fontFamily="monospace"
          fontSize="sm"
          _focus={{ borderColor: '#6c7ae0' }}
          _placeholder={{ color: '#555' }}
        />
        {parsed && (
          <>
            <Box fontSize="3xl" w="40px" textAlign="center">
              {parsed.char}
            </Box>
            <Text color="#666" fontSize="xs" fontFamily="monospace">
              {parsed.label}
            </Text>
          </>
        )}
        <Button
          size="sm"
          bg="#1e3a4a"
          color="#4ac"
          border="1px solid #2a5a6a"
          _hover={{ bg: '#2a5a6a' }}
          disabled={!parsed}
          onClick={() => assign('char')}
        >
          AltGr+{keyLabel}
        </Button>
        <Button
          size="sm"
          bg="#1e2a4a"
          color="#6c7ae0"
          border="1px solid #3a4a7a"
          _hover={{ bg: '#2a3a6a' }}
          disabled={!parsed}
          onClick={() => assign('shiftChar')}
        >
          AltGr+Shift+{keyLabel}
        </Button>
      </Flex>
      {value.trim() && !parsed && (
        <Text color="#a44" fontSize="xs" mt="1">
          Введите один символ или hex-код (например U+20BD)
        </Text>
      )}
    </Box>
  )
}
