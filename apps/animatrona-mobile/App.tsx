/**
 * Animatrona Mobile — главный компонент приложения
 *
 * React Native клиент для просмотра аниме из библиотеки Animatrona Desktop
 */

import { useEffect } from 'react'
import { StatusBar, StyleSheet, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { RootNavigator } from '@/navigation/RootNavigator'
import { initOfflineSystem } from '@/services/offlineInit'
import { TamaguiProvider } from '@/theme/TamaguiProvider'

export default function App() {
  // Инициализация оффлайн-системы при старте
  useEffect(() => {
    initOfflineSystem().catch((err) => {
      console.warn('[App] Ошибка инициализации оффлайн-системы:', err)
    })
  }, [])

  return (
    <GestureHandlerRootView style={styles.container}>
      <TamaguiProvider>
        <SafeAreaProvider>
          <StatusBar barStyle="light-content" backgroundColor="#000" translucent />
          <View style={styles.container}>
            {/* TODO: Отладить NetInfo в release сборках */}
            {/* <OfflineIndicator /> */}
            <RootNavigator />
          </View>
        </SafeAreaProvider>
      </TamaguiProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
})
