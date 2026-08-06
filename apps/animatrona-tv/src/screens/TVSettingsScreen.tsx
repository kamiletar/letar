/**
 * TVSettingsScreen — экран настроек для TV
 *
 * Функции:
 * - Изменение URL сервера
 * - Отключение от сервера
 * - Информация о приложении
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import type { TVStackParamList } from '@/navigation/TVNavigator'
import { useConnectionStore } from '@/store/connection'

type Props = NativeStackScreenProps<TVStackParamList, 'Settings'>

/** Версия приложения */
const APP_VERSION = '1.0.0'

/** Экран настроек */
export function TVSettingsScreen({ navigation }: Props): React.JSX.Element {
  const { connection, disconnect, setConnection, checkConnection } = useConnectionStore()

  const [serverUrl, setServerUrl] = useState(connection?.serverUrl || '')
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<TextInput>(null)

  // Обработка кнопки Back
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isEditing) {
        setIsEditing(false)
        setServerUrl(connection?.serverUrl || '')
        return true
      }
      navigation.goBack()
      return true
    })

    return () => backHandler.remove()
  }, [navigation, isEditing, connection?.serverUrl])

  /** Сохранение нового URL сервера */
  const handleSaveUrl = useCallback(async () => {
    if (!serverUrl.trim()) {
      setError('Введите URL сервера')
      return
    }

    // Проверяем формат URL
    try {
      new URL(serverUrl)
    } catch {
      setError('Неверный формат URL')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      setConnection({ serverUrl: serverUrl.trim() })
      const success = await checkConnection()
      if (success) {
        setIsEditing(false)
      } else {
        setError('Не удалось подключиться к серверу')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка подключения')
    } finally {
      setIsSaving(false)
    }
  }, [serverUrl, setConnection, checkConnection])

  /** Отключение от сервера */
  const handleDisconnect = useCallback(() => {
    disconnect()
    navigation.replace('Connect')
  }, [disconnect, navigation])

  /** Начать редактирование URL */
  const handleEditUrl = useCallback(() => {
    setIsEditing(true)
    setError(null)
    // Фокус на input после рендера
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  /** Отмена редактирования */
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setServerUrl(connection?.serverUrl || '')
    setError(null)
  }, [connection?.serverUrl])

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <View style={styles.header}>
        <Text style={styles.title}>Настройки</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Секция: Сервер */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Сервер</Text>

          {/* Текущий URL / Редактирование */}
          {isEditing
            ? (
              <View style={styles.editContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.input}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="http://192.168.1.100:21123"
                  placeholderTextColor="#666"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                {error && <Text style={styles.errorText}>{error}</Text>}
                <View style={styles.editButtons}>
                  <Pressable
                    style={({ focused }) => [styles.button, styles.buttonPrimary, focused && styles.buttonFocused]}
                    onPress={handleSaveUrl}
                    disabled={isSaving}
                    hasTVPreferredFocus
                  >
                    <Text style={styles.buttonText}>{isSaving ? 'Сохранение...' : 'Сохранить'}</Text>
                  </Pressable>
                  <Pressable
                    style={({ focused }) => [styles.button, styles.buttonSecondary, focused && styles.buttonFocused]}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <Text style={styles.buttonText}>Отмена</Text>
                  </Pressable>
                </View>
              </View>
            )
            : (
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>URL сервера</Text>
                  <Text style={styles.settingValue}>{connection?.serverUrl || 'Не подключен'}</Text>
                </View>
                <Pressable
                  style={({ focused }) => [styles.button, styles.buttonSecondary, focused && styles.buttonFocused]}
                  onPress={handleEditUrl}
                  hasTVPreferredFocus
                >
                  <Text style={styles.buttonText}>Изменить</Text>
                </Pressable>
              </View>
            )}

          {/* Кнопка отключения */}
          {!isEditing && connection && (
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Подключение</Text>
                <Text style={styles.settingValue}>Активно</Text>
              </View>
              <Pressable
                style={({ focused }) => [styles.button, styles.buttonDanger, focused && styles.buttonFocused]}
                onPress={handleDisconnect}
              >
                <Text style={styles.buttonText}>Отключить</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Секция: О приложении */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Название</Text>
            <Text style={styles.infoValue}>Animatrona TV</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Версия</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Платформа</Text>
            <Text style={styles.infoValue}>Android TV</Text>
          </View>

          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>
              Animatrona TV — приложение для просмотра аниме с локального сервера Animatrona. Поддерживает синхронизацию
              аудио/видео, субтитры ASS/SRT и продолжение просмотра.
            </Text>
          </View>
        </View>

        {/* Кнопка назад */}
        {!isEditing && (
          <Pressable
            style={({ focused }) => [styles.button, styles.backButton, focused && styles.buttonFocused]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.buttonText}>← Назад</Text>
          </Pressable>
        )}

        {/* Отступ внизу */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingHorizontal: 48,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 48,
  },

  // Секции
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#888',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Настройки
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 4,
  },
  settingValue: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '500',
  },

  // Редактирование
  editContainer: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    fontSize: 18,
    padding: 16,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#444',
    marginBottom: 12,
  },
  editButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 8,
  },

  // Кнопки
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  buttonPrimary: {
    backgroundColor: '#7c3aed',
  },
  buttonSecondary: {
    backgroundColor: '#333',
  },
  buttonDanger: {
    backgroundColor: '#dc2626',
  },
  buttonFocused: {
    borderColor: '#fff',
    backgroundColor: '#444',
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  backButton: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    marginTop: 16,
  },

  // Информация о приложении
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 18,
    color: '#888',
  },
  infoValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
  },
  descriptionBox: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#aaa',
    lineHeight: 24,
  },

  bottomSpacer: {
    height: 48,
  },
})
