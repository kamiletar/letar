/**
 * Корневой навигатор приложения
 *
 * Ждёт гидрации Zustand persist, потом выбирает начальный экран:
 * - Connect: если нет серверов
 * - Library: если есть хотя бы один сервер
 */

import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'

import { AnimeScreen } from '@/screens/AnimeScreen'
import { ConnectScreen } from '@/screens/ConnectScreen'
import { DownloadsScreen } from '@/screens/DownloadsScreen'
import { FranchiseScreen } from '@/screens/FranchiseScreen'
import { LibraryScreen } from '@/screens/LibraryScreen'
import { PlayerScreen } from '@/screens/PlayerScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { useServersStore } from '@/store/servers'

import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

/** Тёмная тема навигации */
const DarkTheme: Theme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: '#805AD5',
    background: '#0D1117',
    card: '#171923',
    text: '#FFFFFF',
    border: '#2D3748',
    notification: '#805AD5',
  },
}

export function RootNavigator() {
  const [hydrated, setHydrated] = useState(false)

  // Ждём гидрации Zustand persist чтобы знать есть ли серверы
  useEffect(() => {
    if (useServersStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = useServersStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
    return unsub
  }, [])

  const hasServers = useServersStore((state) => state.servers.length > 0)

  // Splash пока store не гидрировался
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D1117', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#805AD5" />
      </View>
    )
  }

  const initialRoute = hasServers ? 'Library' : 'Connect'
  console.log('[RootNavigator] initialRoute:', initialRoute)

  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0D1117' },
        }}
      >
        <Stack.Screen name="Connect" component={ConnectScreen} />
        <Stack.Screen name="Library" component={LibraryScreen} />
        <Stack.Screen name="Anime" component={AnimeScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Franchise" component={FranchiseScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="Player"
          component={PlayerScreen}
          options={{
            animation: 'fade',
            orientation: 'landscape',
            statusBarHidden: true,
          }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="Downloads" component={DownloadsScreen} options={{ animation: 'slide_from_right' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
