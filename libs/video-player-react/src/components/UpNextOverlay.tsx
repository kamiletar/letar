'use client'

/**
 * UpNextOverlay — оверлей "Следующий контент" справа снизу
 *
 * Показывается за 30 секунд до конца эпизода
 * Позиция: справа снизу (как в Netflix)
 * Включает countdown и автопереход
 *
 * Варианты:
 * - type='episode' — следующий эпизод (синяя тема)
 * - type='anime' — сиквел/продолжение (фиолетовая тема)
 */

import { Box, Button, HStack, Icon, Image, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { LuPlay, LuTv, LuX } from 'react-icons/lu'

const MotionBox = motion.create(Box)

export interface UpNextContent {
  /** Тип контента */
  type: 'episode' | 'anime'
  /** Заголовок (название эпизода или аниме) */
  title: string
  /** Подзаголовок (номер эпизода или тип связи) */
  subtitle?: string | null
  /** Готовый URL постера/превью (уже конвертированный для текущей платформы) */
  posterUrl?: string | null
  /** ID аниме (для type='anime') */
  animeId?: string
  /** ID эпизода (для type='episode') */
  episodeId?: string
}

export interface UpNextOverlayProps {
  /** Следующий контент */
  next: UpNextContent | null
  /** Видимость оверлея */
  isVisible: boolean
  /** Включено ли автовоспроизведение */
  autoPlayEnabled?: boolean
  /** Секунд до автоперехода (по умолчанию 5) */
  countdownSeconds?: number
  /** Callback при нажатии "Смотреть" */
  onPlayNow: () => void
  /** Callback при отмене (скрытие оверлея) */
  onCancel: () => void
}

/**
 * Оверлей "Следующий эпизод"
 * Располагается справа снизу, над контролами плеера
 */
export function UpNextOverlay({
  next,
  isVisible,
  autoPlayEnabled = true,
  countdownSeconds = 5,
  onPlayNow,
  onCancel,
}: UpNextOverlayProps) {
  const [countdown, setCountdown] = useState(countdownSeconds)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Сброс countdown при показе
  useEffect(() => {
    if (isVisible) {
      setCountdown(countdownSeconds)
    }
  }, [isVisible, countdownSeconds])

  // Countdown таймер
  useEffect(() => {
    if (!isVisible || !autoPlayEnabled) {
      return
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Время вышло — автопереход
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
          }
          onPlayNow()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [isVisible, autoPlayEnabled, onPlayNow])

  // Определяем стили в зависимости от типа контента
  const contentStyles = useMemo(() => {
    if (next?.type === 'anime') {
      // Сиквел/продолжение — фиолетовая тема
      return {
        badgeText: 'Сиквел',
        badgeBg: 'upNext.sequel.badge',
        buttonColorPalette: 'purple' as const,
        buttonText: 'Смотреть сиквел',
        buttonIcon: LuTv,
      }
    }
    // Следующий эпизод — синяя тема
    return {
      badgeText: 'Следующий',
      badgeBg: 'upNext.episode.badge',
      buttonColorPalette: 'blue' as const,
      buttonText: 'Смотреть',
      buttonIcon: LuPlay,
    }
  }, [next?.type])

  // Форматируем подзаголовок
  const formattedSubtitle =
    next?.type === 'episode'
      ? `Эпизод ${next.subtitle || ''}`
      : next?.type === 'anime'
        ? next.subtitle || 'Продолжение'
        : null

  return (
    <AnimatePresence>
      {isVisible && next && (
        <MotionBox
          position="absolute"
          bottom="100px"
          right="24px"
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.9 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          zIndex={100}
        >
          <Box
            bg="blackAlpha.900"
            backdropFilter="blur(16px)"
            borderRadius="lg"
            border="1px solid"
            borderColor="whiteAlpha.200"
            overflow="hidden"
            w="320px"
            boxShadow="0 8px 32px rgba(0, 0, 0, 0.5)"
          >
            {/* Превью/постер */}
            <Box position="relative" h="120px" bg="blackAlpha.500">
              {next.posterUrl ? (
                <Image src={next.posterUrl} alt={next.title} w="full" h="full" objectFit="cover" opacity={0.7} />
              ) : (
                <Box w="full" h="full" bg="whiteAlpha.100" display="flex" alignItems="center" justifyContent="center">
                  <Icon as={LuPlay} boxSize={10} color="whiteAlpha.500" />
                </Box>
              )}

              {/* Кнопка закрытия */}
              <Button
                position="absolute"
                top={2}
                right={2}
                size="xs"
                variant="ghost"
                colorPalette="whiteAlpha"
                onClick={onCancel}
                minW="auto"
                p={1}
              >
                <Icon as={LuX} boxSize={4} />
              </Button>

              {/* Бейдж типа контента */}
              <Box position="absolute" top={2} left={2} bg={contentStyles.badgeBg} px={2} py={0.5} borderRadius="md">
                <Text fontSize="xs" fontWeight="bold" color="white">
                  {contentStyles.badgeText}
                </Text>
              </Box>
            </Box>

            {/* Информация */}
            <VStack p={3} gap={2} align="stretch">
              {/* Подзаголовок (тип) */}
              {formattedSubtitle && (
                <Text fontSize="xs" color="whiteAlpha.700" textTransform="uppercase" letterSpacing="wider">
                  {formattedSubtitle}
                </Text>
              )}

              {/* Название */}
              <Text fontSize="sm" fontWeight="medium" color="white" lineClamp={2}>
                {next.title}
              </Text>

              {/* Кнопка с countdown */}
              <HStack gap={2} mt={1}>
                <Button flex={1} colorPalette={contentStyles.buttonColorPalette} size="sm" onClick={onPlayNow}>
                  <Icon as={contentStyles.buttonIcon} mr={1} />
                  {contentStyles.buttonText}
                </Button>
                {autoPlayEnabled && countdown > 0 && (
                  <Box
                    bg="whiteAlpha.200"
                    px={3}
                    py={1.5}
                    borderRadius="md"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    minW="50px"
                  >
                    <Text fontSize="sm" color="whiteAlpha.800" fontWeight="medium">
                      {countdown}с
                    </Text>
                  </Box>
                )}
              </HStack>

              {/* Подсказка */}
              <Text fontSize="xs" color="whiteAlpha.500" textAlign="center">
                {autoPlayEnabled ? 'Автопереход включён' : 'Нажмите для перехода'}
              </Text>
            </VStack>
          </Box>
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
