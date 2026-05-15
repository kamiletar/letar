/**
 * OfflineIndicator — баннер состояния сети
 *
 * Различает:
 * - Нет WiFi (netinfo)
 * - Сервер недоступен (offline store)
 * - Оффлайн (работаем из кэша)
 */

import React from 'react'
import { Animated, StyleSheet, Text, View } from 'react-native'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useOfflineStore } from '@/store/offline'

export function OfflineIndicator() {
  const { isConnected: hasNetwork } = useNetworkStatus()
  const isServerReachable = useOfflineStore((s) => s.isServerReachable)
  const translateY = React.useRef(new Animated.Value(-50)).current

  // Определяем нужно ли показывать баннер и какой текст
  const isOnline = hasNetwork && isServerReachable
  const message = !hasNetwork ? 'Нет подключения к сети' : !isServerReachable ? 'Сервер недоступен · Оффлайн режим' : ''

  const backgroundColor = !hasNetwork ? '#E53E3E' : '#DD6B20' // Красный vs оранжевый

  React.useEffect(() => {
    Animated.timing(translateY, {
      toValue: isOnline ? -50 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [isOnline, translateY])

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={[styles.content, { backgroundColor }]}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  content: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingTop: 40, // Safe area
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
})
