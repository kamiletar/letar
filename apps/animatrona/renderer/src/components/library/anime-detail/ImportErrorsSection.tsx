'use client'

/**
 * Секция ошибок импорта — показывается в деталях аниме
 * если есть неразрешённые ImportError записи
 */

import { Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuCaptions, LuCheck, LuMusic, LuTriangleAlert, LuX } from 'react-icons/lu'

import {
  deleteResolvedErrors,
  getImportErrors,
  type ImportErrorWithEpisode,
  resolveImportError,
} from '@/app/_actions/import-error.action'

interface ImportErrorsSectionProps {
  /** ID аниме */
  animeId: string
}

/**
 * Секция ошибок импорта дорожек
 */
export function ImportErrorsSection({ animeId }: ImportErrorsSectionProps) {
  const [errors, setErrors] = useState<ImportErrorWithEpisode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set())

  // Загрузка ошибок
  const loadErrors = useCallback(async () => {
    try {
      const data = await getImportErrors(animeId)
      setErrors(data)
    } catch {
      // Модель может не существовать при первом запуске
    } finally {
      setIsLoading(false)
    }
  }, [animeId])

  useEffect(() => {
    void loadErrors()
  }, [loadErrors])

  // Пометить ошибку как исправленную (dismiss)
  const handleResolve = useCallback(async (errorId: string) => {
    setResolvingIds((prev) => new Set([...prev, errorId]))
    try {
      await resolveImportError(errorId)
      setErrors((prev) => prev.filter((e) => e.id !== errorId))
    } catch (err) {
      console.error('[ImportErrors] Ошибка при dismiss:', err)
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev)
        next.delete(errorId)
        return next
      })
    }
  }, [])

  // Очистить все resolved ошибки
  const handleClearAll = useCallback(async () => {
    // Сначала resolve все, потом удаляем
    for (const error of errors) {
      await resolveImportError(error.id)
    }
    await deleteResolvedErrors(animeId)
    setErrors([])
  }, [errors, animeId])

  // Не показываем если нет ошибок или загрузка
  if (isLoading || errors.length === 0) {
    return null
  }

  return (
    <Box p={4} bg="warning.subtle" borderRadius="lg" borderWidth="1px" borderColor="warning.muted">
      <VStack gap={3} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon as={LuTriangleAlert} color="warning.fg" boxSize={5} />
            <Text fontWeight="medium" fontSize="sm" color="warning.fg">
              Ошибки импорта дорожек
            </Text>
            <Badge colorPalette="orange" size="sm">
              {errors.length}
            </Badge>
          </HStack>
          <Button size="xs" variant="ghost" onClick={handleClearAll}>
            Скрыть все
          </Button>
        </HStack>

        {/* Список ошибок */}
        <VStack gap={2} align="stretch" maxH="200px" overflowY="auto">
          {errors.map((error) => (
            <HStack
              key={error.id}
              gap={2}
              p={2}
              bg="bg.subtle"
              borderRadius="md"
              borderWidth="1px"
              borderColor="border"
            >
              {/* Иконка типа дорожки */}
              <Icon
                as={error.trackType === 'audio' ? LuMusic : LuCaptions}
                color={error.trackType === 'audio' ? 'accent.fg' : 'success.fg'}
                boxSize={4}
                flexShrink={0}
              />

              {/* Информация */}
              <VStack gap={0} align="start" flex={1} minW={0}>
                <HStack gap={2}>
                  <Badge size="sm" colorPalette="purple" variant="subtle">
                    EP {error.episode.number}
                  </Badge>
                  {error.language && (
                    <Badge size="sm" variant="outline">
                      {error.language}
                    </Badge>
                  )}
                  {error.title && (
                    <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                      {error.title}
                    </Text>
                  )}
                </HStack>
                <Text fontSize="xs" color="fg.error" lineClamp={1}>
                  {error.stage}: {error.error}
                </Text>
              </VStack>

              {/* Кнопка dismiss */}
              <Button
                size="xs"
                variant="ghost"
                colorPalette="green"
                onClick={() => handleResolve(error.id)}
                disabled={resolvingIds.has(error.id)}
                flexShrink={0}
              >
                <Icon as={resolvingIds.has(error.id) ? LuCheck : LuX} />
              </Button>
            </HStack>
          ))}
        </VStack>

        {/* Подсказка */}
        <Text fontSize="xs" color="fg.subtle">
          Используйте «Восстановить дорожки» из меню для повторной обработки.
        </Text>
      </VStack>
    </Box>
  )
}
