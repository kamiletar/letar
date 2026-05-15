'use client'

import { Mark } from '@chakra-ui/react'
import type { FuseResultMatch } from 'fuse.js'
import type { ReactNode } from 'react'
import { memo, useMemo } from 'react'

interface HighlightProps {
  /** Текст для подсветки */
  text: string
  /** Массив совпадений от Fuse.js */
  matches?: readonly FuseResultMatch[]
  /** Ключ поля (content, title и т.д.) */
  fieldKey?: string
  /** Максимальная длина текста */
  maxLength?: number
}

/**
 * Компонент подсветки найденных совпадений.
 * Использует данные matches из Fuse.js.
 * Мемоизирует вычисления для оптимизации рендеринга.
 * Обёрнут в React.memo для предотвращения лишних ререндеров.
 */
export const Highlight = memo(function Highlight({
  text,
  matches,
  fieldKey = 'content',
  maxLength = 150,
}: HighlightProps) {
  // Мемоизируем все вычисления подсветки
  const { parts, prefix, suffix, truncated } = useMemo(() => {
    // Находим совпадения для нужного поля
    const fieldMatches = matches?.find((m: FuseResultMatch) => m.key === fieldKey)

    if (!fieldMatches || !fieldMatches.indices.length) {
      // Нет совпадений — возвращаем обрезанный текст
      const truncatedText = text.length > maxLength ? text.slice(0, maxLength) + '...' : text
      return { parts: null, prefix: '', suffix: '', truncated: truncatedText }
    }

    // Сортируем индексы по позиции начала
    const indices = [...fieldMatches.indices].sort((a, b) => a[0] - b[0])

    // Находим диапазон текста для отображения (вокруг первого совпадения)
    const firstMatch = indices[0]
    const matchCenter = Math.floor((firstMatch[0] + firstMatch[1]) / 2)
    const contextRadius = Math.floor(maxLength / 2)

    let startPos = Math.max(0, matchCenter - contextRadius)
    let endPos = Math.min(text.length, matchCenter + contextRadius)

    // Корректируем, чтобы показать больше контекста
    if (startPos === 0) {
      endPos = Math.min(text.length, maxLength)
    }
    if (endPos === text.length) {
      startPos = Math.max(0, text.length - maxLength)
    }

    // Фильтруем индексы, которые попадают в видимый диапазон
    const visibleIndices = indices
      .map(([start, end]) => {
        const adjustedStart = Math.max(start - startPos, 0)
        const adjustedEnd = Math.min(end - startPos, endPos - startPos)
        if (adjustedStart >= 0 && adjustedEnd >= adjustedStart && start < endPos && end > startPos) {
          return [adjustedStart, adjustedEnd] as [number, number]
        }
        return null
      })
      .filter((i): i is [number, number] => i !== null)

    // Получаем видимую часть текста
    const visibleText = text.slice(startPos, endPos)
    const prefixStr = startPos > 0 ? '...' : ''
    const suffixStr = endPos < text.length ? '...' : ''

    // Строим результат с подсветкой
    const resultParts: ReactNode[] = []
    let lastEnd = 0

    for (const [start, end] of visibleIndices) {
      // Добавляем текст до совпадения
      if (start > lastEnd) {
        resultParts.push(visibleText.slice(lastEnd, start))
      }
      // Добавляем подсвеченное совпадение
      resultParts.push(
        <Mark key={start} bg="accent.subtle" color="accent.fg" px={0.5} borderRadius="sm">
          {visibleText.slice(start, end + 1)}
        </Mark>
      )
      lastEnd = end + 1
    }

    // Добавляем остаток текста
    if (lastEnd < visibleText.length) {
      resultParts.push(visibleText.slice(lastEnd))
    }

    return { parts: resultParts, prefix: prefixStr, suffix: suffixStr, truncated: null }
  }, [text, matches, fieldKey, maxLength])

  // Если нет совпадений — возвращаем обрезанный текст
  if (truncated !== null) {
    return <>{truncated}</>
  }

  return (
    <>
      {prefix}
      {parts}
      {suffix}
    </>
  )
})
