/**
 * Компактный переключатель серверов
 *
 * Pill-кнопка в шапке LibraryScreen:
 * - Показывает иконку типа + имя активного сервера + ▼
 * - Тап → bottom sheet со списком серверов
 * - Кнопка "+" для добавления нового сервера
 */

import { useNavigation } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Dimensions, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useServersStore } from '@/store/servers'
import { SERVER_TYPE_ICONS } from '@/types/server'

interface ServerSwitcherProps {
  /** Колбэк при смене сервера (для перезагрузки данных) */
  onServerChange?: () => void
}

export function ServerSwitcher({ onServerChange }: ServerSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const navigation = useNavigation()

  const servers = useServersStore((state) => state.servers)
  const activeServerId = useServersStore((state) => state.activeServerId)
  const connectionStatus = useServersStore((state) => state.connectionStatus)
  const setActiveServer = useServersStore((state) => state.setActiveServer)
  const checkConnection = useServersStore((state) => state.checkConnection)

  const activeServer = servers.find((s) => s.id === activeServerId)

  const handleSelectServer = useCallback(
    async (serverId: string) => {
      if (serverId === activeServerId) {
        setIsOpen(false)
        return
      }

      setActiveServer(serverId)
      setIsOpen(false)

      // Проверяем подключение к новому серверу
      await checkConnection()
      onServerChange?.()
    },
    [activeServerId, setActiveServer, checkConnection, onServerChange],
  )

  const handleAddServer = useCallback(() => {
    setIsOpen(false)
    navigation.navigate('Connect' as never, { mode: 'add' } as never)
  }, [navigation])

  // Если только один сервер — тап сразу открывает добавление нового
  if (servers.length <= 1 && activeServer) {
    return (
      <TouchableOpacity style={styles.pill} onPress={handleAddServer}>
        <Text style={styles.pillIcon}>{SERVER_TYPE_ICONS[activeServer.type]}</Text>
        <Text style={styles.pillText} numberOfLines={1}>
          {activeServer.name}
        </Text>
        <Text style={styles.pillChevron}>+</Text>
      </TouchableOpacity>
    )
  }

  return (
    <>
      {/* Pill-кнопка */}
      <TouchableOpacity style={styles.pill} onPress={() => setIsOpen(true)}>
        {activeServer && (
          <>
            <Text style={styles.pillIcon}>{SERVER_TYPE_ICONS[activeServer.type]}</Text>
            <Text style={styles.pillText} numberOfLines={1}>
              {activeServer.name}
            </Text>
          </>
        )}
        <Text style={styles.pillChevron}>▼</Text>
        {/* Статус-индикатор */}
        <View
          style={[
            styles.statusDot,
            connectionStatus === 'connected' ? styles.statusConnected : styles.statusDisconnected,
          ]}
        />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Серверы</Text>

            {servers.map((server) => (
              <TouchableOpacity
                key={server.id}
                style={[styles.serverRow, server.id === activeServerId && styles.serverRowActive]}
                onPress={() => handleSelectServer(server.id)}
              >
                <Text style={styles.serverIcon}>{SERVER_TYPE_ICONS[server.type]}</Text>
                <View style={styles.serverInfo}>
                  <Text style={styles.serverName}>{server.name}</Text>
                  <Text style={styles.serverUrl} numberOfLines={1}>
                    {server.url.replace(/^https?:\/\//, '')}
                  </Text>
                </View>
                {server.id === activeServerId && (
                  <View style={[styles.statusDot, styles.statusDotLarge, styles.statusConnected]} />
                )}
              </TouchableOpacity>
            ))}

            {/* Кнопка добавления */}
            <TouchableOpacity style={styles.addButton} onPress={handleAddServer}>
              <Text style={styles.addButtonIcon}>+</Text>
              <Text style={styles.addButtonText}>Добавить сервер</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const { width: screenWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A202C',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: screenWidth * 0.5,
  },
  pillIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 100,
  },
  pillChevron: {
    color: '#718096',
    fontSize: 10,
    marginLeft: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  statusDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusConnected: {
    backgroundColor: '#48BB78',
  },
  statusDisconnected: {
    backgroundColor: '#718096',
  },

  // Bottom sheet
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#171923',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Строка сервера
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#1A202C',
  },
  serverRowActive: {
    backgroundColor: '#2D3748',
    borderWidth: 1,
    borderColor: '#805AD5',
  },
  serverIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  serverUrl: {
    color: '#718096',
    fontSize: 13,
    marginTop: 2,
  },

  // Кнопка добавления
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D3748',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addButtonIcon: {
    color: '#805AD5',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  addButtonText: {
    color: '#805AD5',
    fontSize: 15,
    fontWeight: '600',
  },
})
