import type { DiffLine } from '@/lib/versions'
import { Box, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface DiffViewProps {
  lines: DiffLine[]
  /** Что показать, если строк нет (по умолчанию — пустая рамка) */
  empty?: ReactNode
}

const LINE_STYLE = {
  same: { bg: 'transparent', prefix: ' ' },
  add: { bg: 'green.subtle', prefix: '+' },
  del: { bg: 'red.subtle', prefix: '−' },
} as const

/** Построчная разница двух текстов: добавленное — зелёным, удалённое — красным */
export function DiffView({ lines, empty }: DiffViewProps) {
  return (
    <Box borderWidth="1px" borderRadius="md" overflowX="auto" fontFamily="mono" fontSize="sm">
      {lines.length === 0 && empty && <Text p={3} color="fg.muted">{empty}</Text>}
      {lines.map((line, index) => (
        <Box key={index} bg={LINE_STYLE[line.type].bg} px={3} whiteSpace="pre-wrap">
          {LINE_STYLE[line.type].prefix} {line.text}
        </Box>
      ))}
    </Box>
  )
}
