/**
 * Экран настроек
 *
 * Настройки подключения и приложения
 */

import { useCallback, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { SettingsScreenProps } from '@/navigation/types'
import { Haptics } from '@/services/haptics'
import { useServersStore } from '@/store/servers'
import { SERVER_TYPE_ICONS } from '@/types/server'

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const servers = useServersStore((s) => s.servers)
  const activeServerId = useServersStore((s) => s.activeServerId)
  const connectionStatus = useServersStore((s) => s.connectionStatus)
  const checkConnection = useServersStore((s) => s.checkConnection)
  const removeServer = useServersStore((s) => s.removeServer)

  const activeServer = servers.find((s) => s.id === activeServerId)

  // Локальные настройки
  const [autoPlayNext, setAutoPlayNext] = useState(true)
  const [saveProgress, setSaveProgress] = useState(true)
  const [hapticEnabled, setHapticEnabled] = useState(true)

  const handleRemoveServer = useCallback(() => {
    if (!activeServer) return
    Alert.alert('Удалить сервер?', `${activeServer.name} будет удалён из списка.`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          removeServer(activeServer.id)
          if (servers.length <= 1) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Connect' }],
            })
          }
        },
      },
    ])
  }, [activeServer, removeServer, servers.length, navigation])

  const handleCheckConnection = useCallback(async () => {
    const success = await checkConnection()
    if (success) {
      Alert.alert('Успех', 'Соединение активно')
    } else {
      Alert.alert('Ошибка', 'Не удалось подключиться к серверу')
    }
  }, [checkConnection])

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.light()
            navigation.goBack()
          }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Секция подключения */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Подключение</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>
                {activeServer ? `${SERVER_TYPE_ICONS[activeServer.type]} ${activeServer.name}` : 'Нет сервера'}
              </Text>
              <Text style={styles.settingValue}>{activeServer?.url.replace(/^https?:\/\//, '') || '—'}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                connectionStatus === 'connected' && styles.statusConnected,
                connectionStatus === 'error' && styles.statusError,
              ]}
            >
              <Text style={styles.statusText}>
                {connectionStatus === 'connected'
                  ? 'Подключено'
                  : connectionStatus === 'checking'
                  ? 'Проверка...'
                  : 'Ошибка'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              Haptics.light()
              handleCheckConnection()
            }}
          >
            <Text style={styles.buttonText}>Проверить соединение</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger]}
            onPress={() => {
              Haptics.medium()
              handleRemoveServer()
            }}
          >
            <Text style={styles.buttonTextDanger}>Удалить сервер</Text>
          </TouchableOpacity>
        </View>

        {/* Секция плеера */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Плеер</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Автовоспроизведение следующего</Text>
              <Text style={styles.settingDescription}>Автоматически переходить к следующему эпизоду</Text>
            </View>
            <Switch
              value={autoPlayNext}
              onValueChange={setAutoPlayNext}
              trackColor={{ false: '#2D3748', true: '#805AD5' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Сохранять прогресс</Text>
              <Text style={styles.settingDescription}>Автоматически сохранять позицию просмотра</Text>
            </View>
            <Switch
              value={saveProgress}
              onValueChange={setSaveProgress}
              trackColor={{ false: '#2D3748', true: '#805AD5' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Тактильная обратная связь</Text>
              <Text style={styles.settingDescription}>Вибрация при жестах</Text>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: '#2D3748', true: '#805AD5' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Секция о приложении */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Версия</Text>
            <Text style={styles.settingValue}>0.7.0</Text>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Серверов</Text>
            <Text style={styles.settingValue}>{servers.length}</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1117',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A202C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0AEC0',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    minHeight: 48,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  settingDescription: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  settingValue: {
    fontSize: 14,
    color: '#A0AEC0',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#2D3748',
  },
  statusConnected: {
    backgroundColor: '#276749',
  },
  statusError: {
    backgroundColor: '#9B2C2C',
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2D3748',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  buttonDanger: {
    backgroundColor: '#1A202C',
    borderWidth: 1,
    borderColor: '#E53E3E',
  },
  buttonTextDanger: {
    fontSize: 16,
    color: '#E53E3E',
    fontWeight: '500',
  },
  bottomSpacer: {
    height: 24,
  },
})
