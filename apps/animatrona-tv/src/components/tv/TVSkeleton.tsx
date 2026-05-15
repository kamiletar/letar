/**
 * TVSkeleton — skeleton placeholders для загрузки
 *
 * Пульсирующие placeholder карточки вместо ActivityIndicator
 */

import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, View } from 'react-native'

/** Размеры совпадают с FocusableCard */
const CARD_WIDTH = 200
const CARD_HEIGHT = 360

/** Пульсирующая skeleton карточка */
function SkeletonCard(): React.JSX.Element {
  const opacity = useRef(new Animated.Value(0.3)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [opacity])

  return (
    <Animated.View style={[styles.card, { opacity }]}>
      <View style={styles.imageSkeleton} />
      <View style={styles.textSkeleton}>
        <View style={styles.titleLine} />
        <View style={styles.subtitleLine} />
      </View>
    </Animated.View>
  )
}

/** Ряд из skeleton карточек */
export function SkeletonRow(): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.rowTitleSkeleton} />
      <View style={styles.cardsContainer}>
        {Array.from({ length: 5 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 32,
  },
  rowTitleSkeleton: {
    width: 200,
    height: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    marginLeft: 48,
    marginBottom: 16,
  },
  cardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 48,
    gap: 20,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageSkeleton: {
    width: '100%',
    height: 280,
    backgroundColor: '#222',
  },
  textSkeleton: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  titleLine: {
    width: '80%',
    height: 16,
    backgroundColor: '#222',
    borderRadius: 4,
  },
  subtitleLine: {
    width: '50%',
    height: 12,
    backgroundColor: '#222',
    borderRadius: 4,
    marginTop: 8,
  },
})
