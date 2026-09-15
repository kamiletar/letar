/**
 * Карточка одного слота назначения (AltGr или AltGr+Shift) на странице клавиши
 */

import { Box, chakra, Flex, IconButton, Text } from '@chakra-ui/react'
import { LuX } from 'react-icons/lu'
import { displayChar, toUnicode } from './keyboard-data'

interface KeySlotCardProps {
  title: string
  accent: 'brand' | 'accent'
  char: string | undefined
  label: string | undefined
  emptyHint: string
  onRemove: () => void
}

export function KeySlotCard({ title, accent, char, label, emptyHint, onRemove }: KeySlotCardProps) {
  const fgToken = `${accent}.fg`

  return (
    <Box bg="bg.panel" borderWidth="1px" borderColor="border" rounded="l3" p="3">
      <Flex align="center" justify="space-between" mb="2">
        <Text fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em" color="fg.subtle">
          {title}
        </Text>
        {char && (
          <IconButton aria-label="Убрать символ" size="xs" variant="ghost" color="fg.muted" onClick={onRemove}>
            <LuX size={14} />
          </IconButton>
        )}
      </Flex>

      {char
        ? (
          <Flex align="center" gap="3">
            <chakra.span fontSize="4xl" w="48px" textAlign="center" color={fgToken}>
              {displayChar(char)}
            </chakra.span>
            <Box>
              <Text fontSize="sm" color="fg">
                {label}
              </Text>
              <Text fontSize="xs" color="fg.subtle" fontFamily="mono">
                {toUnicode(char)}
              </Text>
            </Box>
          </Flex>
        )
        : (
          <Text color="fg.subtle" fontSize="sm" fontStyle="italic">
            {emptyHint}
          </Text>
        )}
    </Box>
  )
}
