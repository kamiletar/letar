'use client'

import { Gender } from '@/generated/prisma'
import { useRouter } from '@/i18n/navigation'
import { Badge, Box, Button, Dialog, Flex, Heading, Portal, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState, useTransition } from 'react'
import { createFromPreset } from '../_actions/create-from-preset'
import { SIZE_PRESETS, type SizePreset } from '../_lib/size-presets'

/**
 * Format gender for display
 */
function formatGender(gender: Gender): string {
  switch (gender) {
    case Gender.MALE:
      return 'Мужской'
    case Gender.FEMALE:
      return 'Женский'
    default:
      return gender
  }
}

/**
 * Pluralize Russian word based on count
 */
function pluralize(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return one
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return few
  }
  return many
}

/**
 * Modal for creating sizes from preset templates.
 * Displays available presets and allows quick creation of size ranges.
 */
export function CreateFromPresetModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{
    success: boolean
    message: string
    created: number
    skipped: number
  } | null>(null)

  // Refresh the page when transition completes and sizes were created
  useEffect(() => {
    if (!isPending && result?.created && result.created > 0) {
      router.refresh()
    }
  }, [isPending, result?.created, router])

  const handleCreateFromPreset = (preset: SizePreset) => {
    startTransition(async () => {
      try {
        const createResult = await createFromPreset(preset.id)
        setResult({
          success: createResult.success,
          message: createResult.message,
          created: createResult.created,
          skipped: createResult.skipped,
        })

        // Auto-close modal after 3 seconds if successful
        if (createResult.success) {
          setTimeout(() => {
            setOpen(false)
            setResult(null)
          }, 3000)
        }
      } catch (error) {
        console.error('Failed to create from preset:', error)
        setResult({
          success: false,
          message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
          created: 0,
          skipped: 0,
        })
      }
    })
  }

  const handleClose = () => {
    if (!isPending) {
      setOpen(false)
      setResult(null)
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} colorPalette="fg" variant="outline">
        Создать из шаблона
      </Button>

      <Dialog.Root open={open} onOpenChange={(e) => !isPending && setOpen(e.open)}>
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content maxW="2xl">
              <Dialog.Header>
                <Dialog.Title>Создать размеры из шаблона</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                {result ? (
                  <Box
                    p={6}
                    bg={result.success ? 'green.subtle' : 'red.subtle'}
                    borderWidth="1px"
                    borderColor={result.success ? 'green.solid' : 'red.solid'}
                    borderRadius="md"
                  >
                    <VStack gap={2} align="stretch">
                      <Text fontSize="lg" fontWeight="medium" color={result.success ? 'green.fg' : 'red.fg'}>
                        {result.message}
                      </Text>
                      {(result.created > 0 || result.skipped > 0) && (
                        <Text fontSize="sm" color="fg.muted">
                          Создано: {result.created}, пропущено: {result.skipped}
                        </Text>
                      )}
                    </VStack>
                  </Box>
                ) : (
                  <VStack gap={4} align="stretch">
                    <Text color="fg.muted">
                      Выберите стандартную размерную сетку для быстрого создания. Размеры, которые уже существуют, будут
                      пропущены.
                    </Text>

                    {SIZE_PRESETS.map((preset) => (
                      <Box
                        key={preset.id}
                        p={4}
                        borderWidth="1px"
                        borderColor="border"
                        borderRadius="md"
                        _hover={{ borderColor: 'blue.solid', bg: 'bg.subtle' }}
                        transition="all 0.2s"
                      >
                        <Flex justify="space-between" align="start" gap={4}>
                          <VStack gap={2} align="start" flex={1}>
                            <Flex gap={2} align="center">
                              <Heading size="md" textTransform="none">
                                {preset.name}
                              </Heading>
                              <Badge colorPalette="fg" size="sm">
                                {formatGender(preset.gender)}
                              </Badge>
                            </Flex>
                            <Text fontSize="sm" color="fg.muted">
                              {preset.description}
                            </Text>
                            <Text fontSize="sm" fontWeight="medium">
                              {preset.sizes.length} {pluralize(preset.sizes.length, 'размер', 'размера', 'размеров')}{' '}
                              (RU {preset.sizes[0].ru} - {preset.sizes[preset.sizes.length - 1].ru})
                            </Text>
                          </VStack>

                          <Button
                            onClick={() => handleCreateFromPreset(preset)}
                            colorPalette="fg"
                            size="sm"
                            disabled={isPending}
                            loading={isPending}
                          >
                            Создать
                          </Button>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                )}
              </Dialog.Body>

              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" onClick={handleClose} disabled={isPending}>
                    {result ? 'Закрыть' : 'Отмена'}
                  </Button>
                </Dialog.ActionTrigger>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
