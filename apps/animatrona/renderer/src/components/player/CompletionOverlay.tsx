'use client'

/**
 * CompletionOverlay — экран завершения аниме
 *
 * Показывается после последнего эпизода
 * Предлагает сиквел или возврат в библиотеку
 */

import { Box, Button, Heading, HStack, Icon, Image, Spinner, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuArrowRight, LuDownload, LuPartyPopper, LuPlay, LuStar } from 'react-icons/lu'

import { toMediaUrl } from '@/lib/media-url'
import { getSequelSuggestion, type SequelSuggestion } from '@/lib/watch-next'
import { useRouter } from 'next/navigation'

const MotionBox = motion.create(Box)

export interface CompletionOverlayProps {
  /** Видимость оверлея */
  isOpen: boolean
  /** Данные аниме */
  anime: {
    id: string
    name: string
    posterPath?: string | null
    episodeCount: number
  }
  /** Callback при закрытии */
  onClose: () => void
  /** Callback при клике "Добавить в библиотеку" */
  onAddToLibrary?: (shikimoriId: number, name: string) => void
  /** URL для кнопки "К аниме" (default: `/library/${anime.id}`) */
  backUrl?: string
  /** Текст кнопки возврата (default: "К аниме") */
  backLabel?: string
  /** Загружать ли рекомендацию сиквела (default: true) */
  loadSuggestion?: boolean
}

/**
 * Экран завершения аниме
 * Показывает поздравление и рекомендацию сиквела
 */
export function CompletionOverlay({
  isOpen,
  anime,
  onClose,
  onAddToLibrary,
  backUrl,
  backLabel = 'К аниме',
  loadSuggestion: shouldLoadSuggestion = true,
}: CompletionOverlayProps) {
  const router = useRouter()
  const [suggestion, setSuggestion] = useState<SequelSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const resolvedBackUrl = backUrl ?? `/library/${anime.id}`

  // Загружаем рекомендацию при открытии (если loadSuggestion=true)
  useEffect(() => {
    if (!isOpen) {
      setSuggestion(null)
      return
    }

    if (!shouldLoadSuggestion) {
      return
    }

    const load = async () => {
      setIsLoading(true)
      try {
        const result = await getSequelSuggestion(anime.id)
        setSuggestion(result)
      } catch (error) {
        console.error('[CompletionOverlay] Ошибка загрузки рекомендации:', error)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [isOpen, anime.id, shouldLoadSuggestion])

  // Обработчик клика "Смотреть сиквел"
  const handleWatchSequel = () => {
    if (suggestion?.firstEpisodeId) {
      onClose()
      router.push(`/watch/${suggestion.firstEpisodeId}`)
    }
  }

  // Обработчик клика "Добавить в библиотеку"
  const handleAddToLibrary = () => {
    if (suggestion && !suggestion.isInLibrary && onAddToLibrary) {
      onClose()
      onAddToLibrary(suggestion.shikimoriId, suggestion.name)
    }
  }

  // Обработчик "Вернуться"
  const handleBack = () => {
    onClose()
    router.push(resolvedBackUrl)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionBox
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.900"
          backdropFilter="blur(8px)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1000}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MotionBox
            maxW="600px"
            w="full"
            mx={4}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <VStack gap={8} align="stretch">
              {/* Поздравление */}
              <VStack gap={4} textAlign="center">
                <Box
                  w={16}
                  h={16}
                  borderRadius="full"
                  bg="purple.500"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Icon as={LuPartyPopper} boxSize={8} color="player.control" />
                </Box>
                <Heading size="xl" color="player.control">
                  Аниме завершено!
                </Heading>
                <Text color="whiteAlpha.800" fontSize="lg">
                  {anime.name}
                </Text>
                <Text color="whiteAlpha.600" fontSize="sm">
                  {anime.episodeCount}{' '}
                  {anime.episodeCount === 1 ? 'эпизод' : anime.episodeCount < 5 ? 'эпизода' : 'эпизодов'}
                </Text>
              </VStack>

              {/* Рекомендация сиквела */}
              {isLoading
                ? (
                  <Box textAlign="center" py={8}>
                    <Spinner size="lg" color="purple.400" />
                    <Text color="whiteAlpha.600" mt={2} fontSize="sm">
                      Ищем продолжение...
                    </Text>
                  </Box>
                )
                : suggestion
                ? (
                  <Box bg="whiteAlpha.100" borderRadius="xl" p={6} border="1px" borderColor="whiteAlpha.200">
                    <VStack gap={4} align="stretch">
                      <HStack gap={2}>
                        <Icon as={LuArrowRight} color="purple.400" />
                        <Text color="whiteAlpha.800" fontWeight="medium">
                          Что смотреть дальше
                        </Text>
                      </HStack>

                      <HStack gap={4}>
                        {/* Постер */}
                        {suggestion.posterPath
                          ? (
                            <Image
                              src={toMediaUrl(suggestion.posterPath) ?? undefined}
                              alt={suggestion.name}
                              w="80px"
                              h="120px"
                              objectFit="cover"
                              borderRadius="md"
                              flexShrink={0}
                            />
                          )
                          : <Box w="80px" h="120px" bg="whiteAlpha.200" borderRadius="md" flexShrink={0} />}

                        {/* Информация */}
                        <VStack align="start" gap={1} flex={1}>
                          <Text color="purple.400" fontSize="xs" textTransform="uppercase" fontWeight="bold">
                            {suggestion.relationLabel}
                          </Text>
                          <Text color="player.control" fontWeight="medium" lineClamp={2}>
                            {suggestion.name}
                          </Text>
                          {suggestion.year && (
                            <Text color="whiteAlpha.600" fontSize="sm">
                              {suggestion.year}
                            </Text>
                          )}
                          <Text color="whiteAlpha.500" fontSize="xs">
                            {suggestion.reason}
                          </Text>
                          {suggestion.isInLibrary && suggestion.loadedEpisodeCount > 0 && (
                            <Text color="green.400" fontSize="xs">
                              {suggestion.loadedEpisodeCount} эпизод
                              {suggestion.loadedEpisodeCount === 1
                                ? ''
                                : suggestion.loadedEpisodeCount < 5
                                ? 'а'
                                : 'ов'} в библиотеке
                            </Text>
                          )}
                        </VStack>
                      </HStack>

                      {/* Кнопки действия */}
                      {suggestion.isInLibrary && suggestion.firstEpisodeId
                        ? (
                          <Button colorPalette="purple" size="lg" onClick={handleWatchSequel}>
                            <Icon as={LuPlay} mr={2} />
                            Смотреть {suggestion.relationLabel.toLowerCase()}
                          </Button>
                        )
                        : (
                          <Button colorPalette="purple" variant="outline" size="lg" onClick={handleAddToLibrary}>
                            <Icon as={LuDownload} mr={2} />
                            Добавить в библиотеку
                          </Button>
                        )}
                    </VStack>
                  </Box>
                )
                : (
                  <Box textAlign="center" py={4}>
                    <Text color="whiteAlpha.500">Продолжение не найдено</Text>
                  </Box>
                )}

              {/* Дополнительные действия */}
              <HStack gap={4} justify="center">
                <Button variant="ghost" colorPalette="whiteAlpha" onClick={handleBack}>
                  <Icon as={LuArrowLeft} mr={2} />
                  {backLabel}
                </Button>
                <Button variant="ghost" colorPalette="whiteAlpha">
                  <Icon as={LuStar} mr={2} />
                  Оценить
                </Button>
              </HStack>
            </VStack>
          </MotionBox>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
