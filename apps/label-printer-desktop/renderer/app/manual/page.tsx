'use client'

import {
  Box,
  Button,
  Card,
  Container,
  Heading,
  HStack,
  Image,
  Progress,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { LuImage, LuPrinter } from 'react-icons/lu'
import type { PrintResult } from '../../types/electron'

export default function ManualPage() {
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<PrintResult | null>(null)

  const handlePreview = async () => {
    if (!code.trim() || !window.electronAPI) {
      return
    }

    setIsLoading(true)
    try {
      // Используем generateBarcodes для предпросмотра DataMatrix
      const barcodeData = await window.electronAPI.print.generateBarcodes(code)
      setPreview(barcodeData.dataMatrixBase64)
    } catch (error) {
      console.error('Preview error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrint = async () => {
    if (!code.trim() || !window.electronAPI) {
      return
    }

    setIsLoading(true)
    setResult(null)
    try {
      const printResult = await window.electronAPI.print.execute(code)
      setResult(printResult)
      if (printResult.success) {
        setCode('') // Очищаем поле после успешной печати
        setPreview(null)
      }
    } catch (error) {
      setResult({ success: false, error: String(error) })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="2xl" mb={2}>
            Ручной ввод
          </Heading>
          <Text color="fg.muted">Введите код маркировки вручную для печати этикетки</Text>
        </Box>

        <HStack align="start" gap={6}>
          {/* Форма ввода */}
          <Card.Root flex={1}>
            <Card.Header>
              <Heading size="md">Код маркировки</Heading>
            </Card.Header>
            <Card.Body>
              <VStack gap={4} align="stretch">
                <Box>
                  <Text mb={2} fontWeight="medium">
                    DataMatrix код:
                  </Text>
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Вставьте или введите код маркировки..."
                    rows={4}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </Box>

                <HStack gap={2}>
                  <Button
                    colorPalette="gray"
                    variant="outline"
                    onClick={handlePreview}
                    loading={isLoading}
                    disabled={!code.trim()}
                  >
                    <LuImage />
                    Предпросмотр
                  </Button>
                  <Button colorPalette="blue" onClick={handlePrint} loading={isLoading} disabled={!code.trim()}>
                    <LuPrinter />
                    Напечатать
                  </Button>
                </HStack>

                {/* Индикатор прогресса */}
                {isLoading && (
                  <Progress.Root value={null} size="xs" colorPalette="blue">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                )}

                {/* Результат */}
                {result && (
                  <Box p={3} borderRadius="md" bg={result.success ? 'green.subtle' : 'red.subtle'}>
                    <Text color={result.success ? 'green.fg' : 'red.fg'}>
                      {result.success ? result.message || 'Этикетка напечатана!' : result.error || 'Ошибка печати'}
                    </Text>
                  </Box>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* Предпросмотр */}
          <Card.Root w="400px">
            <Card.Header>
              <Heading size="md">Предпросмотр этикетки</Heading>
            </Card.Header>
            <Card.Body>
              {preview ? (
                <Image
                  src={preview}
                  alt="Предпросмотр этикетки"
                  borderRadius="md"
                  border="1px solid"
                  borderColor="border.subtle"
                />
              ) : (
                <Box
                  h="200px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="md"
                  bg="bg.subtle"
                  border="2px dashed"
                  borderColor="border.subtle"
                >
                  <Text color="fg.muted">Нажмите &quot;Предпросмотр&quot; для генерации</Text>
                </Box>
              )}
            </Card.Body>
          </Card.Root>
        </HStack>
      </VStack>
    </Container>
  )
}
