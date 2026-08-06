'use client'

import { Badge, Box, Button, Card, HStack, Icon, Progress, Text, VStack } from '@chakra-ui/react'
import type { RefObject } from 'react'
import { LuCheck, LuCopy, LuLoader, LuPlus, LuPrinter, LuScan, LuX } from 'react-icons/lu'
import { LabelTemplate } from '../../_components/label-template'
import type { ScanEvent } from '../_hooks/use-scans'

/** Пропсы компонента ScanCard */
export interface ScanCardProps {
  /** Событие сканирования */
  scan: ScanEvent
  /** Уникальный ключ скана */
  scanKey: string
  /** Ref для шаблона этикетки */
  labelRef: RefObject<Map<string, HTMLDivElement | null>>
  /** Callback открытия диалога добавления товара */
  onAddProduct: (scan: ScanEvent) => void
  /** Callback печати */
  onPrint: (scan: ScanEvent) => void
  /** Разрешены ли дубликаты */
  allowDuplicates?: boolean
}

/** Получить цвет по статусу */
function getStatusColor(status: ScanEvent['status'], isDuplicate?: boolean): string {
  if (isDuplicate && status === 'preview') {
    return 'orange.500'
  }
  switch (status) {
    case 'success':
      return 'green.500'
    case 'error':
      return 'red.500'
    case 'preview':
      return 'yellow.500'
    default:
      return 'blue.500'
  }
}

/** Получить цвет бейджа по статусу */
function getBadgeColor(status: ScanEvent['status'], isDuplicate?: boolean): string {
  if (isDuplicate && status === 'preview') {
    return 'orange'
  }
  switch (status) {
    case 'success':
      return 'green'
    case 'error':
      return 'red'
    case 'preview':
      return 'yellow'
    default:
      return 'blue'
  }
}

/** Получить текст статуса */
function getStatusText(status: ScanEvent['status'], isDuplicate?: boolean): string {
  if (isDuplicate && status === 'preview') {
    return 'Дубликат'
  }
  switch (status) {
    case 'validating':
      return 'Проверка...'
    case 'preview':
      return 'Предпросмотр'
    case 'printing':
      return 'Печать...'
    case 'success':
      return 'Напечатано'
    case 'error':
      return 'Ошибка'
  }
}

/**
 * Карточка результата сканирования
 * Отображает информацию о сканировании, предпросмотр этикетки и кнопки действий
 */
export function ScanCard({ scan, scanKey, labelRef, onAddProduct, onPrint, allowDuplicates }: ScanCardProps) {
  const isLoading = scan.status === 'printing' || scan.status === 'validating'
  const isDuplicateBlocked = scan.isDuplicate && !allowDuplicates

  return (
    <Card.Root>
      <Card.Body py={3}>
        <HStack>
          {/* Иконка статуса */}
          <Icon fontSize="xl" color={getStatusColor(scan.status, scan.isDuplicate)}>
            {isLoading && <LuLoader className="animate-spin" />}
            {scan.status === 'preview' && !scan.isDuplicate && <LuScan />}
            {scan.status === 'preview' && scan.isDuplicate && <LuCopy />}
            {scan.status === 'success' && <LuCheck />}
            {scan.status === 'error' && <LuX />}
          </Icon>

          {/* Код и детали */}
          <VStack align="start" gap={0} flex={1}>
            {scan.parsedCode
              ? (
                <VStack align="start" gap={0}>
                  <HStack gap={2}>
                    <Text fontWeight="semibold">{scan.parsedCode.gtin13}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      S/N: {scan.parsedCode.serialNumber}
                    </Text>
                  </HStack>
                  {scan.product
                    ? (
                      <Text fontSize="sm" color="blue.500" fontWeight="medium">
                        {scan.product.name}
                        {scan.product.articleCode && ` (${scan.product.articleCode})`}
                      </Text>
                    )
                    : (
                      scan.status === 'preview' && (
                        <Text fontSize="sm" color="orange.500" fontWeight="medium">
                          Товар не найден в базе
                        </Text>
                      )
                    )}
                </VStack>
              )
              : (
                <Text fontFamily="mono" fontSize="sm">
                  {scan.code.substring(0, 50)}
                  {scan.code.length > 50 && '...'}
                </Text>
              )}
            <Text fontSize="xs" color="fg.muted">
              {scan.timestamp.toLocaleTimeString()}
            </Text>
          </VStack>

          {/* Статус и кнопки */}
          <HStack gap={2}>
            {/* Кнопка добавления товара (если не найден) */}
            {scan.status === 'preview' && !scan.product && (
              <Button
                size="sm"
                colorPalette="orange"
                variant="outline"
                onClick={() => onAddProduct(scan)}
              >
                <LuPlus />
                Добавить товар
              </Button>
            )}
            {/* Кнопка печати */}
            {scan.status === 'preview' && (
              <Button
                size="sm"
                colorPalette={isDuplicateBlocked ? 'orange' : 'green'}
                variant={isDuplicateBlocked ? 'outline' : 'solid'}
                onClick={() => onPrint(scan)}
                disabled={!scan.product || isDuplicateBlocked}
                title={!scan.product
                  ? 'Сначала добавьте товар'
                  : isDuplicateBlocked
                  ? 'Этот код уже был напечатан'
                  : undefined}
              >
                <LuPrinter />
                {isDuplicateBlocked ? 'Уже напечатан' : 'Печать'}
              </Button>
            )}
            <Badge colorPalette={getBadgeColor(scan.status, scan.isDuplicate)}>
              {getStatusText(scan.status, scan.isDuplicate)}
            </Badge>
          </HStack>
        </HStack>

        {/* Предупреждение о дубликате */}
        {scan.isDuplicate && scan.status === 'preview' && (
          <Box mt={2} p={2} bg="orange.50" _dark={{ bg: 'orange.900/20' }} borderRadius="md">
            <Text fontSize="sm" color="orange.600" _dark={{ color: 'orange.300' }} fontWeight="semibold">
              Этот код уже был напечатан ранее
            </Text>
            {!allowDuplicates && (
              <Text fontSize="xs" color="orange.500" _dark={{ color: 'orange.400' }} mt={1}>
                Включите &laquo;Разрешить дубликаты&raquo; для повторной печати
              </Text>
            )}
          </Box>
        )}

        {/* Предпросмотр этикетки через LabelTemplate */}
        {scan.labelData && scan.status === 'preview' && (
          <Box
            mt={3}
            p={2}
            bg="gray.100"
            _dark={{ bg: 'gray.800' }}
            borderRadius="md"
            overflow="auto"
            display="flex"
            justifyContent="center"
          >
            <Box transform="scale(0.5)" transformOrigin="top center">
              <LabelTemplate
                ref={(el) => {
                  labelRef.current.set(scanKey, el)
                }}
                data={scan.labelData}
                width={scan.barcodeData?.labelWidth}
                height={scan.barcodeData?.labelHeight}
              />
            </Box>
          </Box>
        )}

        {/* Детали после успешной печати */}
        {scan.parsedCode && scan.status === 'success' && (
          <VStack mt={2} gap={1} align="start">
            <HStack gap={4} fontSize="xs" color="fg.muted" wrap="wrap">
              <Text>
                <Text as="span" fontWeight="semibold">
                  GTIN:
                </Text>{' '}
                {scan.parsedCode.gtin}
              </Text>
              <Text>
                <Text as="span" fontWeight="semibold">
                  Crypto:
                </Text>{' '}
                {scan.parsedCode.cryptoCode.substring(0, 8)}...
              </Text>
            </HStack>
          </VStack>
        )}

        {/* Индикатор прогресса */}
        {isLoading && (
          <Progress.Root value={null} size="xs" colorPalette="blue" mt={2}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        )}

        {/* Ошибка валидации */}
        {scan.status === 'error' && scan.validation?.error && (
          <Box mt={2} p={2} bg="red.50" _dark={{ bg: 'red.900/20' }} borderRadius="md">
            <Text fontSize="sm" color="red.600" _dark={{ color: 'red.300' }} fontWeight="semibold">
              {scan.validation.error.message}
            </Text>
            {scan.validation.error.details && (
              <Text fontSize="xs" color="red.500" _dark={{ color: 'red.400' }} mt={1}>
                {scan.validation.error.details}
              </Text>
            )}
          </Box>
        )}

        {/* Ошибка печати */}
        {scan.status === 'error' && !scan.validation?.error && scan.result?.error && (
          <Text fontSize="sm" color="red.500" mt={2}>
            {scan.result.error}
          </Text>
        )}
      </Card.Body>
    </Card.Root>
  )
}
