/**
 * Типы навигации для React Navigation
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack'

/** Параметры экранов Root Stack */
export type RootStackParamList = {
  /** Экран подключения */
  Connect:
    | {
        /** Режим: initial (первый запуск) или add (добавление сервера) */
        mode?: 'initial' | 'add'
      }
    | undefined

  /** Библиотека аниме */
  Library: undefined

  /** Детали аниме */
  Anime: {
    animeId: string
  }

  /** Видеоплеер */
  Player: {
    episodeId: string
    animeId: string
    /** Начальное время воспроизведения (секунды) */
    startTime?: number
  }

  /** Страница франшизы (сетка аниме) */
  Franchise: {
    /** JSON-сериализованный FranchiseGroup */
    group: string
  }

  /** Настройки */
  Settings: undefined

  /** Управление загрузками */
  Downloads: undefined
}

/** Props для экрана Connect */
export type ConnectScreenProps = NativeStackScreenProps<RootStackParamList, 'Connect'>

/** Props для экрана Library */
export type LibraryScreenProps = NativeStackScreenProps<RootStackParamList, 'Library'>

/** Props для экрана Anime */
export type AnimeScreenProps = NativeStackScreenProps<RootStackParamList, 'Anime'>

/** Props для экрана Player */
export type PlayerScreenProps = NativeStackScreenProps<RootStackParamList, 'Player'>

/** Props для экрана Settings */
export type SettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'Settings'>

/** Props для экрана Downloads */
export type DownloadsScreenProps = NativeStackScreenProps<RootStackParamList, 'Downloads'>

/** Props для экрана Franchise */
export type FranchiseScreenProps = NativeStackScreenProps<RootStackParamList, 'Franchise'>

// Декларация для TypeScript автокомплита в useNavigation (требуется React Navigation)
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
