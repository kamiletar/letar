'use client'

/**
 * Бейдж "Уже в библиотеке"
 *
 * Проверяет наличие аниме в библиотеке по shikimoriId
 * и показывает предупреждение со ссылкой на страницу аниме.
 */

import { Badge, Button, Card, HStack, Icon, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuLibrary } from 'react-icons/lu'

interface LibraryCheckResult {
  exists: boolean
  animeId?: string
  animeName?: string
}

/** Проверяет, есть ли аниме в библиотеке, и показывает предупреждение */
export function AlreadyInLibraryBadge({ shikimoriId }: { shikimoriId?: number | null }) {
  const router = useRouter()
  const [result, setResult] = useState<LibraryCheckResult | null>(null)

  useEffect(() => {
    if (!shikimoriId) {
      setResult(null)
      return
    }

    const api = window.electronAPI ?? window.electron
    if (!api?.library?.checkAnimeExists) {
      return
    }

    let cancelled = false

    api.library
      .checkAnimeExists(shikimoriId)
      .then((response) => {
        if (!cancelled && response.success && response.data) {
          setResult(response.data)
        }
      })
      .catch(() => {
        // Ошибка проверки не критична — просто не показываем бейдж
      })

    return () => {
      cancelled = true
    }
  }, [shikimoriId])

  if (!result?.exists || !result.animeId) {
    return null
  }

  return (
    <Card.Root borderColor="orange.500" borderWidth="1px" bg="orange.500/5" mt={2}>
      <Card.Body py={2} px={3}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon color="orange.500">
              <LuLibrary />
            </Icon>
            <Text fontSize="sm" fontWeight="medium">
              Уже в библиотеке
            </Text>
            {result.animeName && (
              <Badge variant="subtle" colorPalette="orange" size="sm">
                {result.animeName}
              </Badge>
            )}
          </HStack>
          <Button
            size="xs"
            variant="outline"
            colorPalette="orange"
            onClick={() => router.push(`/library/${result.animeId}`)}
          >
            Открыть
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
