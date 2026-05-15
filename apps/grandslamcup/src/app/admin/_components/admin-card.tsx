'use client'

import { Box, Flex, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface AdminCardProps {
  children: ReactNode
}

/** Карточка для мобильного отображения записи */
export function AdminCard({ children }: AdminCardProps) {
  return (
    <Box bg="bg.panel" borderWidth="1px" borderColor="border.muted" borderRadius="lg" p={4}>
      {children}
    </Box>
  )
}

interface AdminCardRowProps {
  /** Метка слева */
  label: string
  /** Значение справа */
  children: ReactNode
}

/** Строка «метка: значение» внутри карточки */
export function AdminCardRow({ label, children }: AdminCardRowProps) {
  return (
    <Flex justify="space-between" align="center" py={1}>
      <Text fontSize="sm" color="fg.muted" flexShrink={0} mr={2}>
        {label}
      </Text>
      <Box textAlign="end" fontSize="sm">
        {children}
      </Box>
    </Flex>
  )
}

interface AdminCardActionsProps {
  children: ReactNode
}

/** Нижняя строка с действиями (кнопки) */
export function AdminCardActions({ children }: AdminCardActionsProps) {
  return (
    <Flex gap={2} pt={3} mt={2} borderTopWidth="1px" borderColor="border.muted" justify="flex-end">
      {children}
    </Flex>
  )
}
