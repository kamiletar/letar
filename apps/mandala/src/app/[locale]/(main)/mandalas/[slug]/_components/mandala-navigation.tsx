'use client'

import { Link as LocalizedLink, useRouter } from '@/i18n/navigation'
import { Box, IconButton, Link, Text } from '@chakra-ui/react'
import NextImage from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'

/** Данные соседней мандалы для навигации */
export interface AdjacentMandala {
  slug: string
  name: string
  imageUrl: string
  centerImageUrl: string | null
  isSquare: boolean
}

interface MandalaNavigationProps {
  /** Предыдущая мандала */
  prevMandala?: AdjacentMandala | null
  /** Следующая мандала */
  nextMandala?: AdjacentMandala | null
  /** Режим отображения: обычный или fullscreen */
  variant?: 'normal' | 'fullscreen'
  /** Видимость кнопок (для плавающего режима в fullscreen) */
  isVisible?: boolean
  /** Callback для навигации (если не указан, используется router.push) */
  onNavigate?: (slug: string) => void
}

/**
 * Компонент навигации между мандалами.
 * Поддерживает клавиатуру (← →), swipe жесты и hover-превью.
 */
export function MandalaNavigation({
  prevMandala,
  nextMandala,
  variant = 'normal',
  isVisible = true,
  onNavigate,
}: MandalaNavigationProps) {
  const router = useRouter()
  const [hoveredSide, setHoveredSide] = useState<'prev' | 'next' | null>(null)

  const isFullscreen = variant === 'fullscreen'

  // Функция навигации (использует callback или router)
  const navigate = useCallback(
    (slug: string) => {
      if (onNavigate) {
        onNavigate(slug)
      } else {
        router.push(`/mandalas/${slug}`)
      }
    },
    [router, onNavigate],
  )

  // Обработка клавиатуры для навигации
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && prevMandala) {
        navigate(prevMandala.slug)
      } else if (e.key === 'ArrowRight' && nextMandala) {
        navigate(nextMandala.slug)
      }
    },
    [navigate, prevMandala, nextMandala],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Swipe жесты для мобильных
  useEffect(() => {
    let touchStartX = 0
    let touchEndX = 0
    const minSwipeDistance = 50

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX
      const distance = touchEndX - touchStartX

      if (Math.abs(distance) > minSwipeDistance) {
        if (distance > 0 && prevMandala) {
          // Свайп вправо — предыдущая
          navigate(prevMandala.slug)
        } else if (distance < 0 && nextMandala) {
          // Свайп влево — следующая
          navigate(nextMandala.slug)
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [navigate, prevMandala, nextMandala])

  // Общие стили для навигационных кнопок
  const navButtonStyles = {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: isFullscreen ? 10000 : 10,
    opacity: isFullscreen ? (isVisible ? 0.7 : 0) : 0.7,
    _hover: { opacity: 1 },
    transition: 'opacity 0.3s',
    pointerEvents: isFullscreen && !isVisible ? ('none' as const) : ('auto' as const),
  }

  return (
    <>
      {/* Предыдущая мандала */}
      {prevMandala && (
        <Box
          {...navButtonStyles}
          left={4}
          onMouseEnter={() => setHoveredSide('prev')}
          onMouseLeave={() => setHoveredSide(null)}
        >
          {isFullscreen
            ? (
              <IconButton
                aria-label={`Предыдущая: ${prevMandala.name}`}
                colorPalette="gray"
                variant="solid"
                size="lg"
                rounded="full"
                onClick={() => navigate(prevMandala.slug)}
              >
                <LuChevronLeft size={24} />
              </IconButton>
            )
            : (
              <Link asChild>
                <LocalizedLink href={`/mandalas/${prevMandala.slug}`}>
                  <IconButton
                    aria-label={`Предыдущая: ${prevMandala.name}`}
                    colorPalette="fg"
                    variant="ghost"
                    size="lg"
                    rounded="full"
                  >
                    <LuChevronLeft size={24} />
                  </IconButton>
                </LocalizedLink>
              </Link>
            )}

          {/* Превью при наведении */}
          {hoveredSide === 'prev' && !isFullscreen && (
            <Box
              position="absolute"
              left="100%"
              top="50%"
              transform="translateY(-50%)"
              ml={2}
              bg="blackAlpha.900"
              borderRadius="md"
              p={2}
              shadow="lg"
              minW="120px"
              zIndex={20}
            >
              <Box position="relative" width="100px" height="100px" borderRadius="sm" overflow="hidden">
                <NextImage
                  src={prevMandala.imageUrl}
                  alt={prevMandala.name}
                  fill
                  sizes="100px"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              <Text fontSize="xs" color="white" mt={1} textAlign="center" lineClamp={1}>
                {prevMandala.name}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {/* Следующая мандала */}
      {nextMandala && (
        <Box
          {...navButtonStyles}
          right={4}
          onMouseEnter={() => setHoveredSide('next')}
          onMouseLeave={() => setHoveredSide(null)}
        >
          {isFullscreen
            ? (
              <IconButton
                aria-label={`Следующая: ${nextMandala.name}`}
                colorPalette="gray"
                variant="solid"
                size="lg"
                rounded="full"
                onClick={() => navigate(nextMandala.slug)}
              >
                <LuChevronRight size={24} />
              </IconButton>
            )
            : (
              <Link asChild>
                <LocalizedLink href={`/mandalas/${nextMandala.slug}`}>
                  <IconButton
                    aria-label={`Следующая: ${nextMandala.name}`}
                    colorPalette="fg"
                    variant="ghost"
                    size="lg"
                    rounded="full"
                  >
                    <LuChevronRight size={24} />
                  </IconButton>
                </LocalizedLink>
              </Link>
            )}

          {/* Превью при наведении */}
          {hoveredSide === 'next' && !isFullscreen && (
            <Box
              position="absolute"
              right="100%"
              top="50%"
              transform="translateY(-50%)"
              mr={2}
              bg="blackAlpha.900"
              borderRadius="md"
              p={2}
              shadow="lg"
              minW="120px"
              zIndex={20}
            >
              <Box position="relative" width="100px" height="100px" borderRadius="sm" overflow="hidden">
                <NextImage
                  src={nextMandala.imageUrl}
                  alt={nextMandala.name}
                  fill
                  sizes="100px"
                  style={{ objectFit: 'cover' }}
                />
              </Box>
              <Text fontSize="xs" color="white" mt={1} textAlign="center" lineClamp={1}>
                {nextMandala.name}
              </Text>
            </Box>
          )}
        </Box>
      )}
    </>
  )
}
