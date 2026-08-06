/**
 * SrtSubtitleView — компонент для отображения SRT субтитров
 *
 * Парсит SRT формат и отображает текстовые субтитры синхронно с видео.
 * Используется как fallback когда ASS субтитры недоступны.
 */

import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View, type ViewStyle } from 'react-native'

/** Структура субтитра */
interface Subtitle {
  index: number
  startMs: number
  endMs: number
  text: string
}

/** Props компонента */
export interface SrtSubtitleViewProps {
  /** Содержимое SRT файла */
  srtContent: string
  /** Текущее время в миллисекундах */
  currentTimeMs: number
  /** Стиль контейнера */
  style?: ViewStyle | ViewStyle[]
  /** Pointer events (по умолчанию 'none' — субтитры не блокируют касания) */
  pointerEvents?: 'none' | 'auto' | 'box-none' | 'box-only'
  /** Размер шрифта субтитров (по умолчанию 18) */
  fontSize?: number
}

/**
 * Парсит SRT формат времени "00:01:23,456" в миллисекунды
 */
function parseSrtTime(timeStr: string): number {
  // Формат: HH:MM:SS,mmm или HH:MM:SS.mmm
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})$/)
  if (!match) {
    console.warn('[SRT] Invalid time format:', timeStr)
    return 0
  }

  const [, hours, minutes, seconds, ms] = match
  return (
    Number.parseInt(hours, 10) * 3600000
    + Number.parseInt(minutes, 10) * 60000
    + Number.parseInt(seconds, 10) * 1000
    + Number.parseInt(ms, 10)
  )
}

/**
 * Парсит SRT файл в массив субтитров
 */
function parseSrt(content: string): Subtitle[] {
  const subtitles: Subtitle[] = []
  const blocks = content.trim().split(/\n\n+/)

  for (const block of blocks) {
    const lines = block.split('\n').map((line) => line.trim())
    if (lines.length < 3) {
      continue
    }

    // Первая строка — индекс
    const index = Number.parseInt(lines[0], 10)
    if (Number.isNaN(index)) {
      continue
    }

    // Вторая строка — время (00:00:00,000 --> 00:00:00,000)
    const timeLine = lines[1]
    const timeMatch = timeLine.match(/^([\d:,.]+)\s*-->\s*([\d:,.]+)/)
    if (!timeMatch) {
      continue
    }

    const startMs = parseSrtTime(timeMatch[1])
    const endMs = parseSrtTime(timeMatch[2])

    // Остальные строки — текст
    const text = lines
      .slice(2)
      .join('\n')
      // Убираем HTML теги (<i>, <b>, <u>, <font>)
      .replace(/<[^>]+>/g, '')

    subtitles.push({ index, startMs, endMs, text })
  }

  return subtitles.sort((a, b) => a.startMs - b.startMs)
}

/**
 * SrtSubtitleView — компонент для отображения SRT субтитров
 *
 * @example
 * ```tsx
 * <SrtSubtitleView
 *   srtContent={srtFileContent}
 *   currentTimeMs={currentTime * 1000}
 *   style={StyleSheet.absoluteFill}
 *   pointerEvents="none"
 * />
 * ```
 */
export function SrtSubtitleView({
  srtContent,
  currentTimeMs,
  style,
  pointerEvents = 'none',
  fontSize,
}: SrtSubtitleViewProps) {
  // Парсим субтитры один раз при изменении контента
  const subtitles = useMemo(() => {
    if (!srtContent) {
      return []
    }
    const parsed = parseSrt(srtContent)
    return parsed
  }, [srtContent])

  // Находим текущий субтитр
  const currentSubtitle = useMemo(() => {
    return subtitles.find((sub) => currentTimeMs >= sub.startMs && currentTimeMs <= sub.endMs)
  }, [subtitles, currentTimeMs])

  if (!currentSubtitle) {
    return null
  }

  return (
    <View style={[styles.container, style]} pointerEvents={pointerEvents}>
      <View style={styles.textContainer}>
        <Text style={[styles.subtitleText, fontSize != null && { fontSize }]}>{currentSubtitle.text}</Text>
      </View>
    </View>
  )
}

/**
 * Хук для загрузки SRT файла по URL
 *
 * @param url URL SRT файла
 * @returns Содержимое SRT файла
 */
export function useSrtContent(url: string | null): string {
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!url) {
      setContent('')
      return
    }

    let isMounted = true

    fetch(url)
      .then((response) => response.text())
      .then((text) => {
        if (isMounted) {
          setContent(text)
        }
      })
      .catch((error) => {
        console.error('[useSrtContent] Failed to load SRT file:', error)
        if (isMounted) {
          setContent('')
        }
      })

    return () => {
      isMounted = false
    }
  }, [url])

  return content
}

/**
 * Проверка формата субтитров — SRT
 */
export function isSrtFormat(format: string): boolean {
  return format.toLowerCase() === 'srt'
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40, // Отступ от нижнего края
    alignItems: 'center',
  },
  textContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    maxWidth: '90%',
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 24,
    // Тень для лучшей читаемости
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
})

export default SrtSubtitleView
