'use client'

import { HStack, Text } from '@chakra-ui/react'

interface DiffRowProps {
  /** Название поля */
  label: string
  /** Старое значение */
  oldVal: string
  /** Новое значение */
  newVal: string
}

/** Элемент diff: показывает было -> стало */
export function DiffRow({ label, oldVal, newVal }: DiffRowProps) {
  const changed = oldVal !== newVal
  return (
    <HStack gap={2} fontSize="sm">
      <Text fontWeight="semibold" minW="100px">
        {label}:
      </Text>
      {changed ? (
        <>
          <Text color="red.400" textDecoration="line-through">
            {oldVal || '—'}
          </Text>
          <Text>→</Text>
          <Text color="green.400">{newVal || '—'}</Text>
        </>
      ) : (
        <Text color="fg.muted">{oldVal || '—'}</Text>
      )}
    </HStack>
  )
}
