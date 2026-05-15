'use client'

import { Box, Card, Container, Heading, HStack, Icon, Switch, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuCopy, LuPrinter } from 'react-icons/lu'
import type { Product } from '../../../src/generated/prisma'
import { type ProductFormData, ProductFormDialog } from '../_components/ProductFormDialog'
import { createProduct } from './_actions'
import { MockScannerPanel, SAMPLE_CODES, ScanList, ScannerStatus } from './_components'
import { type ScanEvent, usePrint, useScannerConnection, useScans } from './_hooks'

/**
 * Главная страница — режим сканирования
 * Поддерживает автопечать и защиту от дубликатов
 */
export default function HomePage() {
  // Состояние сканирований
  const { lastScans, labelRefs, getScanKey, processScan, updateScan, updateScanWithProduct } = useScans()

  // Подключение к сканеру
  const { isListening } = useScannerConnection({ onScan: processScan })

  // Печать этикеток
  const { handlePrint } = usePrint({ labelRefs, getScanKey, onUpdateScan: updateScan })

  // Автопечать (сохраняется в localStorage)
  const [autoPrint, setAutoPrint] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lp-autoPrint') === 'true'
    }
    return false
  })

  // Разрешить дубликаты (сохраняется в localStorage)
  const [allowDuplicates, setAllowDuplicates] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lp-allowDuplicates') === 'true'
    }
    return false
  })

  // Трекер последнего автопечатного скана (чтобы не печатать дважды)
  const lastAutoPrintedKeyRef = useRef<string>('')

  // Сохранение autoPrint в localStorage
  const handleAutoPrintChange = useCallback((checked: boolean) => {
    setAutoPrint(checked)
    localStorage.setItem('lp-autoPrint', String(checked))
  }, [])

  // Сохранение allowDuplicates в localStorage
  const handleAllowDuplicatesChange = useCallback((checked: boolean) => {
    setAllowDuplicates(checked)
    localStorage.setItem('lp-allowDuplicates', String(checked))
  }, [])

  // Автопечать: запускается при появлении нового скана в статусе preview
  useEffect(() => {
    if (!autoPrint) {
      return
    }

    const latest = lastScans[0]
    if (!latest) {
      return
    }
    if (latest.status !== 'preview') {
      return
    }
    if (!latest.product) {
      return
    }

    // Блокировка дубликатов (если не разрешены)
    if (latest.isDuplicate && !allowDuplicates) {
      return
    }

    const key = getScanKey(latest)
    if (key === lastAutoPrintedKeyRef.current) {
      return
    }

    lastAutoPrintedKeyRef.current = key

    // Задержка для рендеринга LabelTemplate в DOM
    const timer = setTimeout(() => {
      handlePrint(latest)
    }, 400)

    return () => clearTimeout(timer)
  }, [lastScans, autoPrint, allowDuplicates, handlePrint, getScanKey])

  // Состояние mock-панели
  const [mockCode, setMockCode] = useState('')
  const [isMockOpen, setIsMockOpen] = useState(true)

  // Состояние для диалога добавления товара
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [productDialogGtin, setProductDialogGtin] = useState<string>('')
  const [productDialogScanKey, setProductDialogScanKey] = useState<string>('')

  // Симуляция сканирования
  const handleMockScan = useCallback(() => {
    if (mockCode.trim()) {
      processScan(mockCode)
      setMockCode('')
    }
  }, [mockCode, processScan])

  // Случайный тестовый код
  const handleRandomScan = useCallback(() => {
    const randomCode = SAMPLE_CODES[Math.floor(Math.random() * SAMPLE_CODES.length)]
    processScan(randomCode)
  }, [processScan])

  // Открытие диалога добавления товара
  const handleOpenProductDialog = useCallback(
    (scan: ScanEvent) => {
      const gtin = scan.parsedCode?.gtin13 || scan.parsedCode?.gtin || ''
      setProductDialogGtin(gtin)
      setProductDialogScanKey(getScanKey(scan))
      setProductDialogOpen(true)
    },
    [getScanKey]
  )

  // Сохранение нового товара
  const handleSaveProduct = useCallback(
    async (data: ProductFormData) => {
      const product: Product = await createProduct({
        name: data.name,
        gtin: data.gtin,
        articleCode: data.articleCode || null,
        composition: data.composition || null,
        color: data.color || null,
        size: data.size || null,
      })

      updateScanWithProduct(productDialogScanKey, product)
    },
    [productDialogScanKey, updateScanWithProduct]
  )

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box textAlign="center">
          <Heading size="2xl" mb={2}>
            Режим сканирования
          </Heading>
          <Text color="fg.muted">Подключите USB сканер и начните сканировать коды маркировки</Text>
        </Box>

        {/* Индикатор статуса */}
        <ScannerStatus isListening={isListening} />

        {/* Панель управления: автопечать + дубликаты */}
        <Card.Root>
          <Card.Body py={3}>
            <HStack justify="space-between" wrap="wrap" gap={4}>
              {/* Автопечать */}
              <HStack gap={3}>
                <Icon fontSize="lg" color={autoPrint ? 'green.500' : 'fg.muted'}>
                  <LuPrinter />
                </Icon>
                <VStack align="start" gap={0}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Печатать сразу
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    Автоматическая печать после сканирования
                  </Text>
                </VStack>
                <Switch.Root checked={autoPrint} onCheckedChange={(e) => handleAutoPrintChange(e.checked)}>
                  <Switch.HiddenInput />
                  <Switch.Control />
                </Switch.Root>
              </HStack>

              {/* Разрешить дубликаты */}
              <HStack gap={3}>
                <Icon fontSize="lg" color={allowDuplicates ? 'orange.500' : 'fg.muted'}>
                  <LuCopy />
                </Icon>
                <VStack align="start" gap={0}>
                  <Text fontWeight="semibold" fontSize="sm">
                    Разрешить дубликаты
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    Печатать уже напечатанные коды
                  </Text>
                </VStack>
                <Switch.Root checked={allowDuplicates} onCheckedChange={(e) => handleAllowDuplicatesChange(e.checked)}>
                  <Switch.HiddenInput />
                  <Switch.Control />
                </Switch.Root>
              </HStack>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Симуляция сканера */}
        <MockScannerPanel
          mockCode={mockCode}
          onMockCodeChange={setMockCode}
          onMockScan={handleMockScan}
          onRandomScan={handleRandomScan}
          onScanCode={processScan}
          isOpen={isMockOpen}
          onOpenChange={setIsMockOpen}
        />

        {/* Последние сканирования */}
        <ScanList
          scans={lastScans}
          labelRef={labelRefs}
          getScanKey={getScanKey}
          onAddProduct={handleOpenProductDialog}
          onPrint={handlePrint}
          allowDuplicates={allowDuplicates}
        />
      </VStack>

      {/* Диалог добавления товара */}
      <ProductFormDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        onSave={handleSaveProduct}
        gtin={productDialogGtin}
      />
    </Container>
  )
}
