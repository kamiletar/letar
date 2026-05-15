'use client'

import { useHaptic } from '@/app/_hooks/use-haptic'
import { Box, Button, HStack, Icon, Text } from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'

interface SwipeableCardProps {
  children: React.ReactNode
  /**
   * Колбэк при свайпе влево (отмена/удаление)
   */
  onSwipeLeft?: () => void
  /**
   * Колбэк при свайпе вправо (подтверждение/завершение)
   */
  onSwipeRight?: () => void
  /**
   * Текст для свайпа влево
   */
  leftLabel?: string
  /**
   * Текст для свайпа вправо
   */
  rightLabel?: string
  /**
   * Отключить свайп влево
   */
  disableLeft?: boolean
  /**
   * Отключить свайп вправо
   */
  disableRight?: boolean
  /**
   * Порог активации свайпа (в пикселях)
   */
  threshold?: number
  /**
   * Показывать fallback кнопки на desktop
   * @default true
   */
  showDesktopButtons?: boolean
  /**
   * aria-label для карточки
   */
  ariaLabel?: string
}

/**
 * Обёртка для карточек с поддержкой свайп-жестов.
 * Свайп влево показывает красную зону (отмена).
 * Свайп вправо показывает зелёную зону (подтверждение).
 *
 * На desktop показывает fallback кнопки для accessibility.
 */
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Отменить',
  rightLabel = 'Подтвердить',
  disableLeft = false,
  disableRight = false,
  threshold = 80,
  showDesktopButtons = true,
  ariaLabel,
}: SwipeableCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offset, setOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const isHorizontalSwipeRef = useRef<boolean | null>(null)
  const hapticTriggeredRef = useRef(false)
  const haptic = useHaptic()

  // Максимальное смещение
  const maxOffset = 120

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    isHorizontalSwipeRef.current = null
    hapticTriggeredRef.current = false
  }, [])

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const currentX = e.touches[0].clientX
      const currentY = e.touches[0].clientY
      const diffX = currentX - startXRef.current
      const diffY = currentY - startYRef.current

      // Определяем направление свайпа при первом движении
      if (isHorizontalSwipeRef.current === null) {
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
          isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY)
        }
      }

      // Если вертикальный свайп — не обрабатываем
      if (isHorizontalSwipeRef.current === false) {
        return
      }

      // Если горизонтальный — блокируем скролл
      if (isHorizontalSwipeRef.current === true) {
        e.preventDefault()
      }

      // Ограничиваем смещение
      let newOffset = diffX

      // Проверяем, разрешён ли свайп в данном направлении
      if (newOffset > 0 && disableRight) {
        newOffset = 0
      }
      if (newOffset < 0 && disableLeft) {
        newOffset = 0
      }

      // Ограничиваем максимальное смещение с rubber band эффектом
      if (newOffset > maxOffset) {
        newOffset = maxOffset + (newOffset - maxOffset) * 0.2
      }
      if (newOffset < -maxOffset) {
        newOffset = -maxOffset + (newOffset + maxOffset) * 0.2
      }

      // Haptic feedback при достижении порога
      const crossedThreshold = Math.abs(newOffset) >= threshold
      if (crossedThreshold && !hapticTriggeredRef.current) {
        hapticTriggeredRef.current = true
        haptic.medium()
      } else if (!crossedThreshold && hapticTriggeredRef.current) {
        hapticTriggeredRef.current = false
        haptic.light()
      }

      setOffset(newOffset)
      setIsDragging(true)
    },
    [disableLeft, disableRight, threshold, haptic]
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)

    // Проверяем, достигнут ли порог
    if (offset > threshold && onSwipeRight && !disableRight) {
      haptic.success()
      onSwipeRight()
    } else if (offset < -threshold && onSwipeLeft && !disableLeft) {
      haptic.warning()
      onSwipeLeft()
    }

    // Возвращаем на место
    setOffset(0)
    isHorizontalSwipeRef.current = null
  }, [offset, threshold, onSwipeLeft, onSwipeRight, disableLeft, disableRight, haptic])

  // Рассчитываем прозрачность индикаторов
  const leftOpacity = Math.min(Math.abs(Math.min(offset, 0)) / threshold, 1)
  const rightOpacity = Math.min(Math.max(offset, 0) / threshold, 1)

  // Если свайп отключён в обе стороны, просто рендерим детей
  if (disableLeft && disableRight) {
    return <>{children}</>
  }

  // Проверка доступности действий
  const hasActions = (!disableLeft && onSwipeLeft) || (!disableRight && onSwipeRight)

  return (
    <Box
      ref={containerRef}
      position="relative"
      overflow="hidden"
      borderRadius="lg"
      role={ariaLabel ? 'group' : undefined}
      aria-label={ariaLabel}
    >
      {/* Фон с индикаторами (только на touch устройствах) */}
      <Box position="absolute" inset={0} display="flex" alignItems="stretch">
        {/* Левый индикатор (зелёный — подтверждение) */}
        {!disableRight && (
          <HStack
            position="absolute"
            left={0}
            top={0}
            bottom={0}
            width={`${Math.max(offset, 0)}px`}
            bg="success.solid"
            color="success.contrast"
            px={4}
            gap={2}
            justify="flex-start"
            align="center"
            opacity={rightOpacity}
            transition={isDragging ? 'none' : 'all 0.2s ease-out'}
            aria-hidden="true"
          >
            {offset > 30 && (
              <>
                <Icon boxSize={5}>
                  <LuCheck />
                </Icon>
                {offset > 60 && (
                  <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
                    {rightLabel}
                  </Text>
                )}
              </>
            )}
          </HStack>
        )}

        {/* Правый индикатор (красный — отмена) */}
        {!disableLeft && (
          <HStack
            position="absolute"
            right={0}
            top={0}
            bottom={0}
            width={`${Math.abs(Math.min(offset, 0))}px`}
            bg="error.solid"
            color="error.contrast"
            px={4}
            gap={2}
            justify="flex-end"
            align="center"
            opacity={leftOpacity}
            transition={isDragging ? 'none' : 'all 0.2s ease-out'}
            aria-hidden="true"
          >
            {offset < -30 && (
              <>
                {offset < -60 && (
                  <Text fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
                    {leftLabel}
                  </Text>
                )}
                <Icon boxSize={5}>
                  <LuX />
                </Icon>
              </>
            )}
          </HStack>
        )}
      </Box>

      {/* Контент карточки */}
      <Box
        transform={`translateX(${offset}px)`}
        transition={isDragging ? 'none' : 'transform 0.2s ease-out'}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        position="relative"
        bg="bg"
        zIndex={1}
      >
        {children}
      </Box>

      {/* Desktop fallback кнопки — видны только на md+ экранах, скрыты на мобильных */}
      {showDesktopButtons && hasActions && (
        <HStack gap={2} justify="flex-end" pt={3} display={{ base: 'none', md: 'flex' }}>
          {!disableRight && onSwipeRight && (
            <Button
              size="sm"
              colorPalette="green"
              variant="outline"
              onClick={() => {
                haptic.success()
                onSwipeRight()
              }}
              aria-label={rightLabel}
            >
              <LuCheck aria-hidden="true" />
              {rightLabel}
            </Button>
          )}
          {!disableLeft && onSwipeLeft && (
            <Button
              size="sm"
              colorPalette="red"
              variant="outline"
              onClick={() => {
                haptic.warning()
                onSwipeLeft()
              }}
              aria-label={leftLabel}
            >
              <LuX aria-hidden="true" />
              {leftLabel}
            </Button>
          )}
        </HStack>
      )}
    </Box>
  )
}
