'use client'

import { Box, Card, Heading, Text, VStack } from '@chakra-ui/react'
import type { RefObject } from 'react'
import type { ScanEvent } from '../_hooks/use-scans'
import { ScanCard } from './scan-card'

/** Пропсы компонента ScanList */
export interface ScanListProps {
  /** Список сканирований */
  scans: ScanEvent[]
  /** Ref для шаблонов этикеток */
  labelRef: RefObject<Map<string, HTMLDivElement | null>>
  /** Функция получения ключа скана */
  getScanKey: (scan: ScanEvent) => string
  /** Callback открытия диалога добавления товара */
  onAddProduct: (scan: ScanEvent) => void
  /** Callback печати */
  onPrint: (scan: ScanEvent) => void
  /** Разрешены ли дубликаты */
  allowDuplicates?: boolean
}

/**
 * Список последних сканирований
 * Отображает карточки сканирований или заглушку при пустом списке
 */
export function ScanList({ scans, labelRef, getScanKey, onAddProduct, onPrint, allowDuplicates }: ScanListProps) {
  return (
    <Box>
      <Heading size="md" mb={4}>
        Последние сканирования
      </Heading>

      {scans.length === 0
        ? (
          <Card.Root>
            <Card.Body>
              <Text textAlign="center" color="fg.muted">
                Пока нет сканирований
              </Text>
            </Card.Body>
          </Card.Root>
        )
        : (
          <VStack gap={2} align="stretch">
            {scans.map((scan, index) => {
              const scanKey = getScanKey(scan)
              return (
                <ScanCard
                  key={`${scan.code}-${index}`}
                  scan={scan}
                  scanKey={scanKey}
                  labelRef={labelRef}
                  onAddProduct={onAddProduct}
                  onPrint={onPrint}
                  allowDuplicates={allowDuplicates}
                />
              )
            })}
          </VStack>
        )}
    </Box>
  )
}
