/**
 * TVRow — горизонтальный ряд карточек для TV
 *
 * Leanback-стиль с фокусируемыми карточками
 */

import React, { useCallback } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'

import { FocusableCard } from './FocusableCard'

export interface TVRowItem {
  id: string
  title: string
  subtitle?: string
  imageUrl?: string
  /** Прогресс просмотра (0-100) */
  progress?: number
}

interface TVRowProps {
  /** Заголовок ряда */
  title: string
  /** Элементы ряда */
  items: TVRowItem[]
  /** Callback при нажатии на элемент */
  onItemPress: (id: string) => void
  /** Первый элемент получает начальный фокус */
  hasTVPreferredFocus?: boolean
  /** ID элемента для восстановления фокуса */
  focusedItemId?: string | null
}

/** Разделитель между карточками */
function ItemSeparator() {
  return <View style={styles.separator} />
}

/** Горизонтальный ряд карточек */
export function TVRow({
  title,
  items,
  onItemPress,
  hasTVPreferredFocus = false,
  focusedItemId,
}: TVRowProps): React.JSX.Element {
  const renderItem = useCallback(
    ({ item, index }: { item: TVRowItem; index: number }) => {
      // Focus memory: восстанавливаем фокус на ранее выбранный элемент
      const shouldFocus = focusedItemId ? item.id === focusedItemId : hasTVPreferredFocus && index === 0

      return (
        <FocusableCard
          title={item.title}
          subtitle={item.subtitle}
          imageUrl={item.imageUrl}
          onPress={() => onItemPress(item.id)}
          hasTVPreferredFocus={shouldFocus}
          progress={item.progress}
        />
      )
    },
    [onItemPress, hasTVPreferredFocus, focusedItemId]
  )

  if (items.length === 0) {
    return <></>
  }

  return (
    <View style={styles.container}>
      {/* Заголовок ряда */}
      <Text style={styles.title}>{title}</Text>

      {/* Горизонтальный список */}
      <FlatList
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        // Оптимизация для TV — не виртуализировать, чтобы фокус работал
        removeClippedSubviews={false}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={11}
      />
    </View>
  )
}

/** Экстрактор ключей */
function keyExtractor(item: TVRowItem) {
  return item.id
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 48,
  },
  separator: {
    width: 20,
  },
})
