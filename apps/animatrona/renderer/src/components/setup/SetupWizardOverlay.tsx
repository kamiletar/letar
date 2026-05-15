'use client'

import { Box, Button, Heading, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCircleCheck, LuFolder, LuHardDrive } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

interface SetupState {
  needsSetup: boolean
  defaultLibraryPath: string
}

/** Форматирует байты в читаемую строку */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Б'
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Полноэкранный wizard выбора папки библиотеки при первом запуске.
 * Показывается только если libraryPath не задан в Settings.
 */
export function SetupWizardOverlay() {
  const [state, setState] = useState<SetupState | null>(null)
  const [libraryPath, setLibraryPath] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [freeSpace, setFreeSpace] = useState<number | null>(null)
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    window.electronAPI?.app.getSetupStatus().then((status) => {
      setState(status)
      setLibraryPath(status.defaultLibraryPath)
    })
  }, [])

  // Загружаем инфо о диске при изменении пути
  useEffect(() => {
    if (!libraryPath || !state?.needsSetup) return
    window.electronAPI?.app.getDiskInfo(libraryPath).then((info) => {
      setFreeSpace(info?.free ?? null)
    })
  }, [libraryPath, state?.needsSetup])

  if (!state?.needsSetup) return null

  const handleSelectFolder = async () => {
    const folder = await window.electronAPI?.dialog.selectFolder()
    if (folder) setLibraryPath(folder)
  }

  const handleComplete = async () => {
    if (!libraryPath) return
    setIsCompleting(true)
    try {
      await window.electronAPI?.app.completeSetup(libraryPath)
      setState((prev) => (prev ? { ...prev, needsSetup: false } : null))
    } catch {
      toaster.error({ title: 'Ошибка настройки', description: 'Не удалось сохранить путь к библиотеке' })
      setIsCompleting(false)
    }
  }

  return (
    <Box
      position="fixed"
      inset={0}
      zIndex={9999}
      bg="bg"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack gap={8} maxW="520px" w="full" px={6}>
        {/* Логотип / иконка */}
        <VStack gap={3}>
          <Icon as={LuHardDrive} boxSize={12} color="purple.400" />
          <Heading size="xl" textAlign="center">
            Добро пожаловать в Animatrona
          </Heading>
          <Text color="fg.muted" textAlign="center">
            Выберите папку для хранения библиотеки аниме и IPFS данных
          </Text>
        </VStack>

        {step === 1 && (
          <VStack gap={4} w="full">
            {/* Выбор папки */}
            <Box w="full">
              <Text fontSize="sm" color="fg.subtle" mb={2}>
                Папка библиотеки
              </Text>
              <HStack gap={2}>
                <Box flex={1} p={3} bg="bg.subtle" borderRadius="md" borderWidth="1px" borderColor="border.subtle">
                  <Text fontSize="sm" color="fg" wordBreak="break-all">
                    {libraryPath || 'Не выбрана'}
                  </Text>
                </Box>
                <Button variant="outline" onClick={handleSelectFolder}>
                  <Icon as={LuFolder} />
                  Выбрать
                </Button>
              </HStack>
            </Box>

            {/* Свободное место */}
            {freeSpace !== null && (
              <HStack w="full" p={3} bg="bg.subtle" borderRadius="md" gap={2}>
                <Icon as={LuHardDrive} color="fg.muted" />
                <Text fontSize="sm" color="fg.muted">
                  Свободно на диске: <strong>{formatBytes(freeSpace)}</strong>
                </Text>
              </HStack>
            )}

            <Text fontSize="xs" color="fg.subtle" textAlign="center">
              IPFS хранилище будет создано автоматически как подпапка{' '}
              <Box as="span" fontFamily="mono" color="fg">
                {libraryPath ? `${libraryPath}/ipfs` : '...'}
              </Box>
            </Text>

            <Button
              colorPalette="purple"
              size="lg"
              w="full"
              disabled={!libraryPath}
              onClick={() => setStep(2)}
            >
              Далее
            </Button>
          </VStack>
        )}

        {step === 2 && (
          <VStack gap={4} w="full">
            <VStack gap={3} w="full" p={4} bg="bg.subtle" borderRadius="lg" align="start">
              <HStack gap={2}>
                <Icon as={LuCircleCheck} color="green.400" />
                <Text fontSize="sm">
                  <strong>Библиотека:</strong> {libraryPath}
                </Text>
              </HStack>
              <HStack gap={2}>
                <Icon as={LuCircleCheck} color="green.400" />
                <Text fontSize="sm">
                  <strong>IPFS хранилище:</strong> {libraryPath}/ipfs
                </Text>
              </HStack>
            </VStack>

            <Text fontSize="sm" color="fg.muted" textAlign="center">
              Эти пути можно изменить позже в Настройках → Библиотека
            </Text>

            <HStack gap={3} w="full">
              <Button variant="outline" flex={1} onClick={() => setStep(1)} disabled={isCompleting}>
                Назад
              </Button>
              <Button colorPalette="purple" flex={1} onClick={handleComplete} loading={isCompleting}>
                {isCompleting ? <Spinner size="sm" /> : 'Готово'}
              </Button>
            </HStack>
          </VStack>
        )}
      </VStack>
    </Box>
  )
}
