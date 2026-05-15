/**
 * ErrorState — компонент отображения ошибки
 */

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export interface ErrorStateProps {
  /** Тип ошибки */
  type?: 'network' | 'general' | 'notFound'
  /** Заголовок */
  title?: string
  /** Сообщение об ошибке */
  message?: string
  /** Callback для повторной попытки */
  onRetry?: () => void
}

export function ErrorState({ type = 'general', title, message, onRetry }: ErrorStateProps) {
  // Заголовки по умолчанию
  const defaultTitles: Record<string, string> = {
    network: 'Нет соединения',
    general: 'Что-то пошло не так',
    notFound: 'Не найдено',
  }

  // Сообщения по умолчанию
  const defaultMessages: Record<string, string> = {
    network: 'Проверьте подключение к интернету и попробуйте снова',
    general: 'Произошла ошибка. Попробуйте позже.',
    notFound: 'Запрашиваемый ресурс не найден',
  }

  const displayTitle = title || defaultTitles[type]
  const displayMessage = message || defaultMessages[type]

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      )}
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F56565',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#805AD5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
