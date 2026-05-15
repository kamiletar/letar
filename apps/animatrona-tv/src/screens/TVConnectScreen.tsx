/**
 * TVConnectScreen — экран подключения к серверу
 *
 * На TV нет камеры для QR-кода, поэтому вводим URL вручную
 * с помощью D-Pad навигации по экранной клавиатуре
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import React, { useCallback, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import type { TVStackParamList } from '@/navigation/TVNavigator'
import { useConnectionStore } from '@/store/connection'
import { normalizeServerUrl } from '@letar/animatrona-shared'

type Props = NativeStackScreenProps<TVStackParamList, 'Connect'>

/** Экран подключения */
export function TVConnectScreen({ navigation }: Props): React.JSX.Element {
  const { connection, setConnection, checkConnection, connectionStatus, errorMessage } = useConnectionStore()

  const [serverUrl, setServerUrl] = useState(connection?.serverUrl?.replace(/^https?:\/\//, '') || '')
  const [isConnecting, setIsConnecting] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const inputRef = useRef<TextInput>(null)

  /** Попытка подключения */
  const handleConnect = useCallback(async () => {
    if (!serverUrl.trim()) {
      return
    }

    setIsConnecting(true)

    const url = normalizeServerUrl(serverUrl)

    // Устанавливаем подключение
    setConnection({ serverUrl: url })

    // Проверяем
    const isValid = await checkConnection()

    setIsConnecting(false)

    if (isValid) {
      navigation.replace('Home')
    }
  }, [serverUrl, setConnection, checkConnection, navigation])

  const isLoading = isConnecting || connectionStatus === 'checking'

  return (
    <View style={styles.container}>
      {/* Заголовок */}
      <Text style={styles.title}>Animatrona TV</Text>
      <Text style={styles.subtitle}>Подключение к серверу</Text>

      {/* Инструкция */}
      <Text style={styles.instruction}>
        Введите URL сервера Animatrona Desktop.{'\n'}
        Убедитесь, что компьютер и TV в одной сети.
      </Text>

      {/* Поле ввода URL */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, inputFocused && styles.inputFocused]}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="10.8.1.16:4000"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isLoading}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          onSubmitEditing={handleConnect}
          // D-Pad фокус
          autoFocus
        />
      </View>

      {/* Кнопка подключения */}
      <Pressable
        style={({ focused }) => [styles.button, focused && styles.buttonFocused, isLoading && styles.buttonDisabled]}
        onPress={handleConnect}
        disabled={isLoading}
      >
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Подключиться</Text>}
      </Pressable>

      {/* Ошибка */}
      {connectionStatus === 'error' && errorMessage && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Подсказка */}
      <Text style={styles.hint}>Нажмите Enter для подключения</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#888',
    marginBottom: 48,
  },
  instruction: {
    fontSize: 18,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 32,
  },
  inputContainer: {
    width: '100%',
    maxWidth: 600,
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 4,
    borderColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    color: '#fff',
  },
  inputFocused: {
    borderColor: '#a78bfa',
    backgroundColor: '#222',
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: 'transparent',
    minWidth: 200,
    alignItems: 'center',
  },
  buttonFocused: {
    borderColor: '#fff',
    backgroundColor: '#8b5cf6',
    transform: [{ scale: 1.08 }],
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  hint: {
    position: 'absolute',
    bottom: 48,
    fontSize: 16,
    color: '#666',
  },
})
