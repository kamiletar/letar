/**
 * ExpandableText — раскрывающийся текст с анимацией
 *
 * Для длинных описаний с кнопкой "Показать полностью" / "Свернуть".
 */

import { Box, Text } from '@chakra-ui/react'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { LuChevronDown, LuChevronUp } from 'react-icons/lu'

interface ExpandableTextProps {
  /** Текст для отображения */
  text: string
  /** Максимальное количество строк в свёрнутом виде (по умолчанию 3) */
  maxLines?: number
  /** Цвет текста */
  color?: string
  /** Размер шрифта */
  fontSize?: string
  /** Проверять prefers-reduced-motion */
  respectReducedMotion?: boolean
}

export function ExpandableText({
  text,
  maxLines = 3,
  color = 'gray.300',
  fontSize = 'sm',
  respectReducedMotion = true,
}: ExpandableTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [needsExpansion, setNeedsExpansion] = useState(false)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const textRef = useRef<HTMLDivElement>(null)
  const fullHeightRef = useRef<number>(0)
  const collapsedHeightRef = useRef<number>(0)

  // Проверяем prefers-reduced-motion
  const prefersReducedMotion =
    respectReducedMotion && typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  // Измеряем высоту текста для определения необходимости кнопки
  useLayoutEffect(() => {
    if (!textRef.current) {
      return
    }

    const element = textRef.current

    // Измеряем полную высоту
    element.style.webkitLineClamp = 'unset'
    element.style.maxHeight = 'none'
    fullHeightRef.current = element.scrollHeight

    // Измеряем свёрнутую высоту
    element.style.webkitLineClamp = String(maxLines)
    element.style.maxHeight = ''
    collapsedHeightRef.current = element.scrollHeight

    // Нужна ли кнопка
    const needs = fullHeightRef.current > collapsedHeightRef.current + 10
    setNeedsExpansion(needs)

    // Сбрасываем стили
    if (!isExpanded && needs) {
      element.style.webkitLineClamp = String(maxLines)
    } else {
      element.style.webkitLineClamp = 'unset'
    }

    // Устанавливаем начальную высоту для анимации
    if (needs) {
      setHeight(isExpanded ? fullHeightRef.current : collapsedHeightRef.current)
    }
  }, [text, maxLines, isExpanded])

  const handleToggle = useCallback(() => {
    if (!needsExpansion) {
      return
    }

    if (prefersReducedMotion) {
      // Без анимации
      setIsExpanded((prev) => !prev)
      return
    }

    // С анимацией
    if (isExpanded) {
      // Сворачиваем
      setHeight(collapsedHeightRef.current)
      // Даём время на анимацию перед применением line-clamp
      setTimeout(() => {
        setIsExpanded(false)
      }, 300)
    } else {
      // Разворачиваем
      setIsExpanded(true)
      setHeight(fullHeightRef.current)
    }
  }, [needsExpansion, isExpanded, prefersReducedMotion])

  return (
    <Box>
      {/* Текст */}
      <Box
        ref={textRef}
        overflow="hidden"
        style={{
          height: needsExpansion && !prefersReducedMotion ? height : 'auto',
          transition: prefersReducedMotion ? undefined : 'height 0.3s ease-out',
        }}
      >
        <Text
          color={color}
          fontSize={fontSize}
          lineHeight="tall"
          css={
            !isExpanded && needsExpansion
              ? {
                  display: '-webkit-box',
                  WebkitLineClamp: maxLines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          {text}
        </Text>
      </Box>

      {/* Кнопка развернуть/свернуть */}
      {needsExpansion && (
        <Box
          as="button"
          display="flex"
          alignItems="center"
          gap={1}
          mt={2}
          color="purple.400"
          fontSize="sm"
          fontWeight="medium"
          onClick={handleToggle}
          transition="all 0.2s"
          _hover={{ color: 'purple.300' }}
          _active={{ transform: 'scale(0.98)' }}
        >
          {isExpanded ? (
            <>
              <LuChevronUp size={16} />
              Свернуть
            </>
          ) : (
            <>
              <LuChevronDown size={16} />
              Показать полностью
            </>
          )}
        </Box>
      )}
    </Box>
  )
}
