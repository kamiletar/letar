'use client'

import { Box, Grid, Heading, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuChevronLeft, LuCloud, LuFlower2, LuMusic, LuX, LuZap } from 'react-icons/lu'
import {
  type CustomAudioTrack,
  MEDITATION_TRACKS,
  type MeditationTrackCategory,
} from '../../_schemas/viewer-settings.schema'
import { CategoryCard, type CategoryData } from './category-card'
import { TrackCard } from './track-card'

const MotionBox = motion.create(Box)

/**
 * Категории треков с иконками и градиентами
 */
const CATEGORIES: CategoryData[] = [
  {
    id: 'none',
    name: 'Тишина',
    icon: LuX,
    gradient: 'linear(to-br, gray.700, gray.900)',
    description: 'Без музыки',
  },
  {
    id: 'meditation',
    name: 'Медитация',
    icon: LuFlower2,
    gradient: 'linear(to-br, purple.500, purple.800)',
    description: 'Спокойные мелодии',
  },
  {
    id: 'ambient',
    name: 'Эмбиент',
    icon: LuCloud,
    gradient: 'linear(to-br, blue.500, teal.700)',
    description: 'Атмосферные звуки',
  },
  {
    id: 'trance',
    name: 'Транс',
    icon: LuZap,
    gradient: 'linear(to-br, orange.500, pink.600)',
    description: 'Энергичные ритмы',
  },
  {
    id: 'custom',
    name: 'Мои треки',
    icon: LuMusic,
    gradient: 'linear(to-br, green.500, cyan.600)',
    description: 'Загруженные файлы',
  },
]

interface SoundscapeSelectorProps {
  /** Открыт ли селектор */
  isOpen: boolean
  /** Закрытие селектора */
  onClose: () => void
  /** ID текущего встроенного трека */
  currentTrackId: string
  /** ID текущего кастомного трека */
  currentCustomTrackId: string | null
  /** Кастомные треки пользователя */
  customTracks: CustomAudioTrack[]
  /** Выбор встроенного трека */
  onSelectTrack: (trackId: string) => void
  /** Выбор кастомного трека */
  onSelectCustomTrack: (trackId: string) => void
  /** Callback для открытия менеджера треков */
  onOpenTrackManager?: () => void
}

/**
 * Full-screen селектор треков с категориями.
 */
export function SoundscapeSelector({
  isOpen,
  onClose,
  currentTrackId,
  currentCustomTrackId,
  customTracks,
  onSelectTrack,
  onSelectCustomTrack,
  onOpenTrackManager,
}: SoundscapeSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<MeditationTrackCategory | 'custom' | null>(null)
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  /** Получить треки для категории */
  const getTracksForCategory = useCallback(
    (category: MeditationTrackCategory | 'custom') => {
      if (category === 'custom') {
        return customTracks
      }
      return MEDITATION_TRACKS.filter((t) => t.category === category)
    },
    [customTracks]
  )

  /** Определить текущую выбранную категорию */
  useEffect(() => {
    if (currentCustomTrackId) {
      setSelectedCategory('custom')
    } else {
      const track = MEDITATION_TRACKS.find((t) => t.id === currentTrackId)
      if (track) {
        setSelectedCategory(track.category)
      }
    }
  }, [currentTrackId, currentCustomTrackId])

  /** Остановить превью */
  const stopPreview = useCallback(() => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current.src = ''
    }
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }
    setPreviewTrackId(null)
  }, [])

  /** Выбор трека */
  const handleTrackSelect = useCallback(
    (trackId: string, isCustom: boolean) => {
      stopPreview()
      if (isCustom) {
        onSelectCustomTrack(trackId)
      } else {
        onSelectTrack(trackId)
      }
      onClose()
    },
    [stopPreview, onSelectTrack, onSelectCustomTrack, onClose]
  )

  /** Очистка при закрытии */
  useEffect(() => {
    if (!isOpen) {
      stopPreview()
    }
  }, [isOpen, stopPreview])

  /** Очистка при размонтировании */
  useEffect(() => {
    return () => {
      stopPreview()
    }
  }, [stopPreview])

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionBox
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0, 0, 0, 0.95)"
          backdropFilter="blur(20px)"
          zIndex={10002}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          overflowY="auto"
        >
          <Box maxW="800px" mx="auto" p={6} pt={8}>
            {/* Header */}
            <HStack justify="space-between" mb={8}>
              {selectedCategory ? (
                <HStack gap={3}>
                  <IconButton aria-label="Назад" variant="ghost" size="lg" onClick={() => setSelectedCategory(null)}>
                    <LuChevronLeft />
                  </IconButton>
                  <Heading size="lg" color="white">
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.name}
                  </Heading>
                </HStack>
              ) : (
                <Heading size="lg" color="white">
                  Выберите саундскейп
                </Heading>
              )}

              <IconButton aria-label="Закрыть" variant="ghost" size="lg" onClick={onClose}>
                <LuX />
              </IconButton>
            </HStack>

            {/* Категории или треки */}
            <AnimatePresence mode="wait">
              {!selectedCategory ? (
                /* Сетка категорий */
                <MotionBox
                  key="categories"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)' }} gap={4}>
                    {CATEGORIES.map((category) => (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        isSelected={
                          category.id === 'custom'
                            ? !!currentCustomTrackId
                            : !currentCustomTrackId &&
                              MEDITATION_TRACKS.find((t) => t.id === currentTrackId)?.category === category.id
                        }
                        onClick={() => setSelectedCategory(category.id)}
                        tracksCount={getTracksForCategory(category.id).length}
                      />
                    ))}
                  </Grid>
                </MotionBox>
              ) : (
                /* Список треков категории */
                <MotionBox
                  key="tracks"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <VStack align="stretch" gap={2}>
                    {selectedCategory === 'custom' && customTracks.length === 0 ? (
                      <Box textAlign="center" py={8}>
                        <Text color="gray.400" mb={4}>
                          Нет загруженных треков
                        </Text>
                        {onOpenTrackManager && (
                          <IconButton
                            aria-label="Загрузить треки"
                            size="lg"
                            colorPalette="purple"
                            onClick={() => {
                              onClose()
                              onOpenTrackManager()
                            }}
                          >
                            <LuMusic />
                          </IconButton>
                        )}
                      </Box>
                    ) : (
                      getTracksForCategory(selectedCategory).map((track) => {
                        const isCustom = selectedCategory === 'custom'
                        const isSelected = isCustom
                          ? currentCustomTrackId === track.id
                          : !currentCustomTrackId && currentTrackId === track.id

                        return (
                          <TrackCard
                            key={track.id}
                            name={track.name}
                            isSelected={isSelected}
                            onClick={() => handleTrackSelect(track.id, isCustom)}
                            isPreviewPlaying={previewTrackId === track.id}
                          />
                        )
                      })
                    )}
                  </VStack>
                </MotionBox>
              )}
            </AnimatePresence>
          </Box>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
