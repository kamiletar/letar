/**
 * Экран подключения — добавление Desktop или Tracker сервера
 *
 * Режимы:
 * - initial: первый запуск (нет серверов)
 * - add: добавление дополнительного сервера (кнопка "Назад")
 */

import { useNavigation, useRoute } from '@react-navigation/native'
import { ScanLine } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { QRScannerModal, type QRScanResult } from '@/components/QRScannerModal'
import { useServersStore } from '@/store/servers'
import type { ServerType } from '@/types/server'

export function ConnectScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const mode = (route.params as { mode?: 'initial' | 'add' } | undefined)?.mode ?? 'initial'

  const [serverType, setServerType] = useState<ServerType>('desktop')
  const [serverUrl, setServerUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [serverName, setServerName] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const addServer = useServersStore((state) => state.addServer)
  const setActiveServer = useServersStore((state) => state.setActiveServer)

  // Подключение к серверу
  const handleConnect = useCallback(async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Ошибка', 'Введите URL сервера')
      return
    }

    if (serverType === 'tracker' && !apiKey.trim()) {
      Alert.alert('Ошибка', 'Введите API Key для Tracker')
      return
    }

    setIsConnecting(true)

    // Desktop: http по умолчанию (локальная сеть), Tracker: https
    let url = serverUrl.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = serverType === 'tracker' ? `https://${url}` : `http://${url}`
    }
    url = url.replace(/\/+$/, '')
    const name = serverName.trim() || (serverType === 'desktop' ? 'Desktop' : 'Tracker')
    const key = serverType === 'tracker' ? apiKey.trim() : undefined

    // Проверяем подключение ДО добавления сервера
    // (иначе RootNavigator переключит экран при servers.length > 0)
    try {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (key) headers['Authorization'] = `Bearer ${key}`

      const endpoint = serverType === 'desktop' ? `${url}/api/status` : `${url}/api/anime?limit=1`

      console.log('[ConnectScreen] Проверка подключения:', endpoint)
      const response = await fetch(endpoint, { method: 'GET', headers })
      console.log('[ConnectScreen] Ответ:', response.status)

      if (!response.ok) {
        const errorText = response.status === 401 ? 'Неверный API Key' : `Сервер вернул ошибку: ${response.status}`
        throw new Error(errorText)
      }

      // Для Desktop проверяем server.isRunning
      if (serverType === 'desktop') {
        const data = await response.json()
        if (!data.server?.isRunning) {
          throw new Error('Сервер не запущен')
        }
      }

      // Успех — добавляем сервер
      const server = addServer({ name, type: serverType, url, apiKey: key })
      setActiveServer(server.id)
      useServersStore.getState().setConnectionStatus('connected')
      console.log('[ConnectScreen] Сервер добавлен:', server.name, server.id)

      setIsConnecting(false)

      if (mode === 'add') {
        navigation.goBack()
      } else {
        // Initial mode — переходим на Library
        navigation.reset({ index: 0, routes: [{ name: 'Library' as never }] })
      }
    } catch (error) {
      setIsConnecting(false)
      const message = error instanceof Error ? error.message : 'Ошибка соединения'
      console.warn('[ConnectScreen] Ошибка подключения:', message)
      Alert.alert('Ошибка подключения', message)
    }
  }, [serverUrl, apiKey, serverName, serverType, addServer, setActiveServer, mode, navigation])

  // Обработка результата QR-сканирования — заполняем форму
  const handleQRScan = useCallback((result: QRScanResult) => {
    setShowScanner(false)
    setServerType(result.type)
    setServerUrl(result.url)
    if (result.apiKey) setApiKey(result.apiKey)
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Кнопка "Назад" в режиме добавления */}
        {mode === 'add' && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>← Назад</Text>
          </TouchableOpacity>
        )}

        {/* Иконка */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{serverType === 'desktop' ? '💻' : '🌐'}</Text>
        </View>

        <Text style={styles.title}>{mode === 'add' ? 'Добавить сервер' : 'Подключение'}</Text>

        {/* Кнопка сканирования QR-кода */}
        <TouchableOpacity style={styles.qrButton} onPress={() => setShowScanner(true)}>
          <ScanLine size={20} color="#805AD5" />
          <Text style={styles.qrButtonText}>Сканировать QR-код</Text>
        </TouchableOpacity>

        {/* Переключатель типа сервера */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, serverType === 'desktop' && styles.typeButtonActive]}
            onPress={() => setServerType('desktop')}
          >
            <Text style={[styles.typeButtonText, serverType === 'desktop' && styles.typeButtonTextActive]}>
              💻 Desktop
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, serverType === 'tracker' && styles.typeButtonActive]}
            onPress={() => setServerType('tracker')}
          >
            <Text style={[styles.typeButtonText, serverType === 'tracker' && styles.typeButtonTextActive]}>
              🌐 Tracker
            </Text>
          </TouchableOpacity>
        </View>

        {/* Имя сервера (опционально) */}
        <TextInput
          style={styles.input}
          placeholder="Имя (например, Мой ПК)"
          placeholderTextColor="#718096"
          value={serverName}
          onChangeText={setServerName}
          autoCapitalize="sentences"
          editable={!isConnecting}
        />

        {/* URL сервера */}
        <TextInput
          style={styles.input}
          placeholder={serverType === 'desktop' ? '192.168.1.100:3100' : 'animatrona-tracker.letar.best'}
          placeholderTextColor="#718096"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!isConnecting}
        />

        {/* API Key для Tracker */}
        {serverType === 'tracker' && (
          <TextInput
            style={styles.input}
            placeholder="API Key (at_xxx...)"
            placeholderTextColor="#718096"
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!isConnecting}
          />
        )}

        {/* Кнопка подключения */}
        <TouchableOpacity
          style={[styles.button, isConnecting && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={isConnecting}
        >
          <Text style={styles.buttonText}>{isConnecting ? 'Подключение...' : 'Подключиться'}</Text>
        </TouchableOpacity>

        {/* Подсказка */}
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            {serverType === 'desktop'
              ? '💡 Убедитесь, что телефон и компьютер\nнаходятся в одной Wi-Fi сети'
              : '💡 API Key можно создать в профиле\nна сайте Tracker → API Ключи'}
          </Text>
        </View>
      </View>

      {/* QR-сканер */}
      <QRScannerModal visible={showScanner} onClose={() => setShowScanner(false)} onScan={handleQRScan} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 12,
    minWidth: 44,
    minHeight: 44,
  },
  backButtonText: {
    color: '#805AD5',
    fontSize: 16,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#805AD5',
    marginBottom: 16,
  },
  qrButtonText: {
    color: '#805AD5',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1A202C',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    width: '100%',
    maxWidth: 320,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  typeButtonActive: {
    backgroundColor: '#2D3748',
  },
  typeButtonText: {
    color: '#718096',
    fontSize: 15,
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    height: 56,
    backgroundColor: '#1A202C',
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 17,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#2D3748',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#805AD5',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 220,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#553C9A',
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  hint: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#1A202C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  hintText: {
    fontSize: 14,
    color: '#A0AEC0',
    textAlign: 'center',
    lineHeight: 20,
  },
})
