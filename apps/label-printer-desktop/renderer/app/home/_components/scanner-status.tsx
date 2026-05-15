'use client'

import { Card, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuScan } from 'react-icons/lu'

/** Пропсы компонента ScannerStatus */
export interface ScannerStatusProps {
  /** Слушает ли приложение сканер */
  isListening: boolean
}

/**
 * Индикатор статуса сканера
 * Показывает активен ли сканер и готов ли к приёму данных
 */
export function ScannerStatus({ isListening }: ScannerStatusProps) {
  return (
    <Card.Root>
      <Card.Body>
        <HStack justify="center" gap={4}>
          <Icon fontSize="4xl" color={isListening ? 'green.500' : 'fg.muted'}>
            <LuScan />
          </Icon>
          <VStack align="start" gap={0}>
            <Text fontWeight="semibold">{isListening ? 'Ожидание сканирования...' : 'Сканер не активен'}</Text>
            <Text fontSize="sm" color="fg.muted">
              {isListening ? 'Отсканируйте код маркировки для печати этикетки' : 'Electron API не доступен'}
            </Text>
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
