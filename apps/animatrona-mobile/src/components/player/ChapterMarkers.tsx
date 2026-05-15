/**
 * ChapterMarkers — маркеры глав на прогресс-баре
 *
 * Показывает позиции глав (OP, ED, chapters) на таймлайне
 */

import { StyleSheet, View } from 'react-native'

interface Chapter {
  title: string
  startTime: number
  endTime: number
}

interface ChapterMarkersProps {
  chapters: Chapter[]
  duration: number
}

/** Цвета для разных типов глав */
const getChapterColor = (title: string): string => {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes('op') || lowerTitle.includes('opening') || lowerTitle.includes('intro')) {
    return '#48BB78' // green
  }
  if (lowerTitle.includes('ed') || lowerTitle.includes('ending') || lowerTitle.includes('outro')) {
    return '#ED8936' // orange
  }
  return '#718096' // gray
}

export function ChapterMarkers({ chapters, duration }: ChapterMarkersProps) {
  if (duration === 0 || chapters.length === 0) {
    return null
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {chapters.map((chapter, index) => {
        const left = (chapter.startTime / duration) * 100
        const width = ((chapter.endTime - chapter.startTime) / duration) * 100

        return (
          <View
            key={`${chapter.title}-${index}`}
            style={[
              styles.marker,
              {
                left: `${left}%`,
                width: `${Math.max(width, 0.5)}%`,
                backgroundColor: getChapterColor(chapter.title),
              },
            ]}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
  },
  marker: {
    position: 'absolute',
    top: 0,
    height: '100%',
    opacity: 0.4,
    borderRadius: 2,
  },
})
