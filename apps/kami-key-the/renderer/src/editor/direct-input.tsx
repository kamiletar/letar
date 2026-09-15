/**
 * Прямой ввод символа или Unicode-кода (U+XXXX)
 *
 * Принимает:
 * - Hex-код: U+20BD, 20BD, u+00A9
 * - Символ напрямую: ₽, ©, →
 */

import { Box, chakra, Flex, Input, Text } from '@chakra-ui/react'
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
    <Box bg="bg.panel" borderWidth="1px" borderColor="border" rounded="l3" p="3">
      <Text fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="fg.subtle" mb="2">
        Свой символ или код
      </Text>
      <Flex align="center" gap="2" mb="2">
        <Input
          placeholder="₽ или U+20BD"
          maxLength={7}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          fontFamily="mono"
        />
        {parsed && (
          <Flex align="center" gap="1" flexShrink={0}>
            <chakra.span fontSize="2xl">{parsed.char}</chakra.span>
            <Text color="fg.subtle" fontSize="xs" fontFamily="mono">
              {parsed.label}
            </Text>
          </Flex>
        )}
      </Flex>
      <Flex gap="2">
        <chakra.button
          type="button"
          flex="1"
          px="3"
          py="1.5"
          rounded="l2"
          fontSize="sm"
          bg="brand.subtle"
          color="brand.fg"
          _hover={{ bg: 'brand.emphasized' }}
          _disabled={{ opacity: 0.4, cursor: 'default' }}
          disabled={!parsed}
          onClick={() => assign('char')}
        >
          AltGr+{keyLabel}
        </chakra.button>
        <chakra.button
          type="button"
          flex="1"
          px="3"
          py="1.5"
          rounded="l2"
          fontSize="sm"
          bg="accent.subtle"
          color="accent.fg"
          _hover={{ bg: 'accent.emphasized' }}
          _disabled={{ opacity: 0.4, cursor: 'default' }}
          disabled={!parsed}
          onClick={() => assign('shiftChar')}
        >
          +Shift+{keyLabel}
        </chakra.button>
      </Flex>
      {value.trim() && !parsed && (
        <Text color="fg.error" fontSize="xs" mt="1">
          Введите один символ или hex-код (например U+20BD)
        </Text>
      )}
    </Box>
  )
}
