/**
 * TV Navigator — главный навигатор приложения
 *
 * Stack-навигация для TV с экранами:
 * - Connect — подключение к серверу
 * - Home — главный экран с библиотекой
 * - Anime — детали аниме
 * - Player — плеер
 */

import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React, { useEffect, useState } from 'react'

import { useConnectionStore } from '@/store/connection'

import { TVAnimeScreen } from '@/screens/TVAnimeScreen'
import { TVConnectScreen } from '@/screens/TVConnectScreen'
import { TVHomeScreen } from '@/screens/TVHomeScreen'
import { TVPlayerScreen } from '@/screens/TVPlayerScreen'
import { TVSettingsScreen } from '@/screens/TVSettingsScreen'

/** Типы параметров для навигации */
export type TVStackParamList = {
  Connect: undefined
  Home: undefined
  Anime: { animeId: string }
  Player: {
    animeId: string
    episodeId: string
    /** Начальная позиция (опционально) */
    startTime?: number
  }
  Settings: undefined
}

const Stack = createNativeStackNavigator<TVStackParamList>()

/** Главный навигатор */
export function TVNavigator(): React.JSX.Element {
  const { connection, checkConnection } = useConnectionStore()
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)
  const [hasValidConnection, setHasValidConnection] = useState(false)

  // Проверяем соединение при запуске
  useEffect(() => {
    async function check() {
      if (connection) {
        const isValid = await checkConnection()
        setHasValidConnection(isValid)
      }
      setIsCheckingConnection(false)
    }
    check()
  }, [connection, checkConnection])

  // Показываем пустой экран пока проверяем соединение
  if (isCheckingConnection) {
    return <></>
  }

  // Определяем начальный экран
  const initialRoute = hasValidConnection ? 'Home' : 'Connect'

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen name="Connect" component={TVConnectScreen} />
      <Stack.Screen name="Home" component={TVHomeScreen} />
      <Stack.Screen name="Anime" component={TVAnimeScreen} />
      <Stack.Screen
        name="Player"
        component={TVPlayerScreen}
        options={{
          // Полноэкранный плеер без анимации
          animation: 'none',
        }}
      />
      <Stack.Screen name="Settings" component={TVSettingsScreen} />
    </Stack.Navigator>
  )
}
