'use client'

/**
 * Страница настроек приложения
 * Разделена на 5 вкладок: Библиотека, Кодирование, Просмотр, Приложение, P2P
 * P2P содержит подвкладки: IPFS, Трекер, Статистика
 */

import { Box, Tabs, Text, VStack } from '@chakra-ui/react'
import {
  LuArrowUpDown,
  LuChartColumn,
  LuClapperboard,
  LuFileText,
  LuFolderOpen,
  LuGlobe,
  LuPlay,
  LuRadio,
  LuSettings,
  LuShare2,
} from 'react-icons/lu'

import { Header } from '@/components/layout'

import {
  EncodingProfilesCard,
  LibrarySettingsCard,
  LogsTab,
  MobileAccessCard,
  P2PSharingCard,
  P2PStatsTab,
  PlayerSettingsCard,
  QBittorrentSettingsCard,
  ThemeSettingsCard,
  TorrentSettingsCard,
  TrackerPublishingCard,
  TranscodingSettingsCard,
  TraySettingsCard,
  useSettings,
} from './_settings'
import { UpdateSettingsCardNew } from './_settings/UpdateSettingsCardNew'

// Отключаем статическую генерацию для страницы настроек
export const dynamic = 'force-dynamic'

/**
 * Страница настроек приложения
 */
export default function SettingsPage() {
  const {
    // Настройки
    settings,
    isLoading,
    defaultPaths,
    handleSave,
    handleSaveWithTray,

    // Профили
    profiles,
    isLoadingProfiles,
    refetchProfiles,
  } = useSettings()

  if (isLoading) {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Настройки" />
        <Box p={6}>
          <Text color="fg.subtle">Загрузка настроек...</Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title="Настройки" />

      <Box p={6}>
        <Tabs.Root defaultValue="library" variant="line" lazyMount>
          <Tabs.List>
            <Tabs.Trigger value="library">
              <LuFolderOpen />
              Библиотека
            </Tabs.Trigger>
            <Tabs.Trigger value="encoding">
              <LuClapperboard />
              Кодирование
            </Tabs.Trigger>
            <Tabs.Trigger value="playback">
              <LuPlay />
              Просмотр
            </Tabs.Trigger>
            <Tabs.Trigger value="app">
              <LuSettings />
              Приложение
            </Tabs.Trigger>
            <Tabs.Trigger value="sharing">
              <LuShare2 />
              P2P
            </Tabs.Trigger>
            <Tabs.Trigger value="logs">
              <LuFileText />
              Логи
            </Tabs.Trigger>
          </Tabs.List>

          {/* Библиотека: пути к папкам */}
          <Tabs.Content value="library">
            <Box maxW="800px" py={6}>
              <LibrarySettingsCard settings={settings} defaultPaths={defaultPaths} onSave={handleSave} />
            </Box>
          </Tabs.Content>

          {/* Кодирование: GPU, битрейт, профили */}
          <Tabs.Content value="encoding">
            <VStack gap={6} align="stretch" maxW="800px" py={6}>
              <TranscodingSettingsCard settings={settings} onSave={handleSave} />
              <EncodingProfilesCard profiles={profiles} isLoading={isLoadingProfiles} onRefetch={refetchProfiles} />
            </VStack>
          </Tabs.Content>

          {/* Просмотр: плеер */}
          <Tabs.Content value="playback">
            <Box maxW="800px" py={6}>
              <PlayerSettingsCard settings={settings} onSave={handleSave} />
            </Box>
          </Tabs.Content>

          {/* Приложение: тема + трей + мобильный доступ + обновления */}
          <Tabs.Content value="app">
            <VStack gap={6} align="stretch" maxW="800px" py={6}>
              <ThemeSettingsCard />
              <TraySettingsCard settings={settings} onSaveWithTray={handleSaveWithTray} />
              <MobileAccessCard />
              <UpdateSettingsCardNew />
            </VStack>
          </Tabs.Content>

          {/* P2P: подвкладки IPFS, Трекер, Статистика */}
          <Tabs.Content value="sharing">
            <Box py={6}>
              <Tabs.Root defaultValue="ipfs" variant="enclosed" size="sm" lazyMount>
                <Tabs.List>
                  <Tabs.Trigger value="ipfs">
                    <LuRadio />
                    IPFS
                  </Tabs.Trigger>
                  <Tabs.Trigger value="tracker">
                    <LuGlobe />
                    Трекер
                  </Tabs.Trigger>
                  <Tabs.Trigger value="torrent">
                    <LuArrowUpDown />
                    Торренты
                  </Tabs.Trigger>
                  <Tabs.Trigger value="stats">
                    <LuChartColumn />
                    Статистика
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="torrent">
                  <Box maxW="800px" py={4}>
                    <VStack gap={4} align="stretch">
                      <QBittorrentSettingsCard />
                      <TorrentSettingsCard />
                    </VStack>
                  </Box>
                </Tabs.Content>

                <Tabs.Content value="ipfs">
                  <Box maxW="800px" py={4}>
                    <P2PSharingCard />
                  </Box>
                </Tabs.Content>

                <Tabs.Content value="tracker">
                  <Box maxW="800px" py={4}>
                    <TrackerPublishingCard />
                  </Box>
                </Tabs.Content>

                <Tabs.Content value="stats">
                  <Box maxW="900px" py={4}>
                    <P2PStatsTab />
                  </Box>
                </Tabs.Content>
              </Tabs.Root>
            </Box>
          </Tabs.Content>

          {/* Логи: tail main.log с live-обновлением */}
          <Tabs.Content value="logs">
            <Box py={6}>
              <LogsTab />
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  )
}
