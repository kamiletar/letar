'use client'

import { Badge, Flex, Icon, NativeSelect, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCheck, LuCircleAlert, LuPrinter } from 'react-icons/lu'
import type { PrinterInfo, PrinterStatus } from '../../types/electron'

export function StatusBar() {
  const [status, setStatus] = useState<PrinterStatus | null>(null)
  const [printers, setPrinters] = useState<PrinterInfo[]>([])
  const [currentPrinter, setCurrentPrinter] = useState<string>('')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) {
      return undefined
    }

    // Получаем начальный статус
    window.electronAPI.printer.getStatus().then(setStatus)

    // Загружаем список принтеров
    window.electronAPI.printer.list().then(setPrinters)

    // Загружаем текущие настройки для получения выбранного принтера
    window.electronAPI.settings.get().then((settings) => {
      setCurrentPrinter(settings.printerName)
    })

    // Периодический опрос статуса каждые 15 секунд
    const pollInterval = setInterval(() => {
      window.electronAPI.printer.getStatus().then(setStatus)
    }, 15_000)

    // Подписываемся на изменения
    const unsubscribe = window.electronAPI.on.printerStatus(setStatus)

    return () => {
      clearInterval(pollInterval)
      unsubscribe()
    }
  }, [])

  /**
   * Быстрое переключение принтера
   */
  const handlePrinterChange = async (printerName: string) => {
    if (!window.electronAPI) {
      return
    }

    setCurrentPrinter(printerName)

    // Сохраняем в настройки
    await window.electronAPI.settings.save({ printerName })

    // Обновляем статус принтера
    const newStatus = await window.electronAPI.printer.getStatus()
    setStatus(newStatus)
  }

  const isReady = status?.connected && !status?.error

  return (
    <Flex
      position="fixed"
      bottom={0}
      left="250px"
      right={0}
      h="40px"
      bg="bg.panel"
      borderTopWidth={1}
      borderColor="border.subtle"
      align="center"
      px={4}
      gap={4}
    >
      {/* Принтер + быстрое переключение */}
      <Flex align="center" gap={2}>
        <Icon color={isReady ? 'green.500' : 'red.500'}>
          <LuPrinter />
        </Icon>
        {printers.length > 0 ? (
          <NativeSelect.Root size="xs" w="auto" minW="150px">
            <NativeSelect.Field
              value={currentPrinter}
              onChange={(e) => handlePrinterChange(e.currentTarget.value)}
              fontSize="sm"
            >
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        ) : (
          <Text fontSize="sm" color="fg.muted">
            {status?.name || 'Принтер не настроен'}
          </Text>
        )}
        {status?.mode === 'MOCK' && (
          <Badge size="sm" colorPalette="yellow">
            Тест
          </Badge>
        )}
      </Flex>

      {/* Ошибка (если есть) */}
      {status?.error && (
        <Flex align="center" gap={2}>
          <Icon color="orange.500">
            <LuCircleAlert />
          </Icon>
          <Text fontSize="sm" color="orange.500" truncate maxW="400px">
            {status.error}
          </Text>
        </Flex>
      )}

      {/* Spacer */}
      <Flex flex={1} />

      {/* Статус готовности */}
      <Flex align="center" gap={2}>
        <Icon color={isReady ? 'green.500' : 'fg.muted'}>
          <LuCheck />
        </Icon>
        <Text fontSize="sm" color={isReady ? 'green.500' : 'fg.muted'}>
          {isReady ? 'Готов' : 'Не готов'}
        </Text>
      </Flex>
    </Flex>
  )
}
