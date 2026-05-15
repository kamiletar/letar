'use client'

/**
 * WelcomeDialog — диалог приветствия при первом запуске
 *
 * Показывается новым пользователям для знакомства с приложением.
 * После показа флаг сохраняется в localStorage.
 *
 * Шаги:
 * 1. Приветствие + краткое описание
 * 2. Быстрый обзор горячих клавиш
 * 3. CTA — импортировать первое аниме
 */

import { Box, Button, Dialog, HStack, Kbd, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuArrowRight, LuFilm, LuKeyboard, LuRocket, LuSparkles } from 'react-icons/lu'

const WELCOME_SHOWN_KEY = 'animatrona-welcome-shown'

/** Ключевые хоткеи для отображения */
const KEY_SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Command Palette — быстрый поиск и команды' },
  { keys: ['Ctrl', 'I'], description: 'Импорт видео' },
  { keys: ['Ctrl', '/'], description: 'Показать все горячие клавиши' },
  { keys: ['Space'], description: 'Play / Pause в плеере' },
  { keys: ['I'], description: 'Информация о видео (в плеере)' },
]

interface WelcomeDialogProps {
  /** Колбэк для открытия ImportWizard */
  onOpenImport: () => void
  /** Колбэк для показа всех хоткеев */
  onShowShortcuts: () => void
}

/**
 * Диалог приветствия при первом запуске
 */
export function WelcomeDialog({ onOpenImport, onShowShortcuts }: WelcomeDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  // Проверяем был ли показан Welcome Dialog
  useEffect(() => {
    const wasShown = localStorage.getItem(WELCOME_SHOWN_KEY)
    if (!wasShown) {
      setOpen(true)
    }
  }, [])

  // Закрытие диалога с сохранением флага
  const handleClose = useCallback(() => {
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true')
    setOpen(false)
  }, [])

  // Следующий шаг
  const handleNext = useCallback(() => {
    if (step < 2) {
      setStep((prev) => prev + 1)
    } else {
      handleClose()
    }
  }, [step, handleClose])

  // Начать импорт
  const handleStartImport = useCallback(() => {
    handleClose()
    onOpenImport()
  }, [handleClose, onOpenImport])

  // Показать все хоткеи
  const handleShowAllShortcuts = useCallback(() => {
    handleClose()
    onShowShortcuts()
  }, [handleClose, onShowShortcuts])

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && handleClose()} placement="center" size="lg">
      <Dialog.Backdrop bg="overlay.heavy" />
      <Dialog.Positioner>
        <Dialog.Content bg="bg.subtle" borderColor="border.subtle" borderWidth={1} maxW="500px">
          <Dialog.Body py={6} px={6}>
            {/* Шаг 1: Приветствие */}
            {step === 0 && (
              <VStack gap={6} textAlign="center">
                <Box p={4} borderRadius="full" bg="primary.subtle" color="primary.fg">
                  <LuSparkles size={40} />
                </Box>

                <VStack gap={2}>
                  <Text fontSize="2xl" fontWeight="bold" color="fg">
                    Добро пожаловать в Animatrona!
                  </Text>
                  <Text color="fg.muted" maxW="400px">
                    Мощный медиаплеер и транскодер для аниме. Импортируйте видео, транскодируйте в AV1/HEVC, смотрите с
                    субтитрами — всё в одном приложении.
                  </Text>
                </VStack>

                <VStack gap={3} pt={2}>
                  <HStack gap={3}>
                    <FeatureIcon icon={LuFilm} label="Импорт видео" />
                    <FeatureIcon icon={LuRocket} label="GPU кодирование" />
                    <FeatureIcon icon={LuKeyboard} label="Горячие клавиши" />
                  </HStack>
                </VStack>
              </VStack>
            )}

            {/* Шаг 2: Горячие клавиши */}
            {step === 1 && (
              <VStack gap={5} align="stretch">
                <VStack gap={2} textAlign="center">
                  <Box p={3} borderRadius="full" bg="primary.subtle" color="primary.fg">
                    <LuKeyboard size={32} />
                  </Box>
                  <Text fontSize="xl" fontWeight="bold" color="fg">
                    Горячие клавиши
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    Animatrona управляется клавиатурой для максимальной скорости
                  </Text>
                </VStack>

                <VStack align="stretch" gap={2} bg="bg.muted" p={4} borderRadius="lg">
                  {KEY_SHORTCUTS.map((shortcut, index) => (
                    <HStack key={index} justify="space-between">
                      <Text fontSize="sm" color="fg.muted">
                        {shortcut.description}
                      </Text>
                      <HStack gap={1}>
                        {shortcut.keys.map((key, keyIndex) => (
                          <Kbd
                            key={keyIndex}
                            bg="bg.emphasized"
                            borderColor="border"
                            borderWidth={1}
                            px={2}
                            py={0.5}
                            fontSize="xs"
                            borderRadius="md"
                          >
                            {key}
                          </Kbd>
                        ))}
                      </HStack>
                    </HStack>
                  ))}
                </VStack>

                <Button variant="ghost" size="sm" onClick={handleShowAllShortcuts} alignSelf="center">
                  Показать все горячие клавиши
                </Button>
              </VStack>
            )}

            {/* Шаг 3: CTA — импорт */}
            {step === 2 && (
              <VStack gap={6} textAlign="center">
                <Box p={4} borderRadius="full" bg="primary.subtle" color="primary.fg">
                  <LuFilm size={40} />
                </Box>

                <VStack gap={2}>
                  <Text fontSize="xl" fontWeight="bold" color="fg">
                    Готовы начать?
                  </Text>
                  <Text color="fg.muted" maxW="400px">
                    Импортируйте папку с аниме, и Animatrona автоматически распознает серии, извлечёт метаданные и
                    подготовит к просмотру.
                  </Text>
                </VStack>

                <VStack gap={3} pt={2} w="full">
                  <Button colorPalette="purple" size="lg" w="full" onClick={handleStartImport}>
                    <LuFilm />
                    Импортировать видео
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClose}>
                    Позже
                  </Button>
                </VStack>
              </VStack>
            )}
          </Dialog.Body>

          <Dialog.Footer borderTopWidth={1} borderColor="border.subtle" pt={3} justifyContent="space-between">
            {/* Индикатор шагов */}
            <HStack gap={2}>
              {[0, 1, 2].map((i) => (
                <Box
                  key={i}
                  w={2}
                  h={2}
                  borderRadius="full"
                  bg={i === step ? 'primary.solid' : 'bg.emphasized'}
                  transition="background 0.2s"
                />
              ))}
            </HStack>

            {/* Кнопка "Далее" */}
            {step < 2 && (
              <Button colorPalette="purple" size="sm" onClick={handleNext}>
                Далее
                <LuArrowRight />
              </Button>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  )
}

/** Иконка фичи для первого шага */
function FeatureIcon({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <VStack gap={2}>
      <Box p={3} borderRadius="lg" bg="bg.muted" color="fg.muted">
        <Icon size={24} />
      </Box>
      <Text fontSize="xs" color="fg.subtle">
        {label}
      </Text>
    </VStack>
  )
}
