/**
 * EmptyState — компонент пустого состояния
 */

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export interface EmptyStateProps {
  /** Заголовок */
  title?: string
  /** Описание */
  message?: string
  /** Иконка (опционально) */
  icon?: React.ReactNode
}

export function EmptyState({ title = 'Пусто', message = 'Здесь пока ничего нет', icon }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
})
