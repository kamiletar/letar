/**
 * Drawer для отображения деталей обновления
 *
 * Показывает changelog из GitHub Releases, прогресс загрузки
 * и предоставляет действия для управления обновлениями
 */

'use client'

import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  HStack,
  Icon,
  Progress,
  Skeleton,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCalendar, LuDownload, LuFileText, LuX } from 'react-icons/lu'
import ReactMarkdown from 'react-markdown'
import { useUpdateStore } from './update-store'

/**
 * Drawer с деталями обновления
 *
 * Поддерживает три состояния:
 * - available: показывает changelog и кнопку "Скачать"
 * - downloading: показывает прогресс загрузки
 * - downloaded: показывает кнопку "Установить"
 */
export function UpdateDrawer() {
  const open = useUpdateStore((state) => state.drawerOpen)
  const setOpen = useUpdateStore((state) => state.setDrawerOpen)
  const status = useUpdateStore((state) => state.status)
  const changelog = useUpdateStore((state) => state.changelog)
  const skipVersion = useUpdateStore((state) => state.skipVersion)

  const [isLoadingChangelog, setIsLoadingChangelog] = useState(false)

  // Загрузить changelog при открытии drawer
  useEffect(() => {
    if (open && status.updateInfo && !changelog && window.electronAPI?.updater) {
      setIsLoadingChangelog(true)
      window.electronAPI.updater
        .getChangelog(status.updateInfo.version)
        .then((result) => {
          if (result.success && result.changelog) {
            useUpdateStore.getState().setChangelog(result.changelog)
          }
        })
        .finally(() => {
          setIsLoadingChangelog(false)
        })
    }
  }, [open, status.updateInfo, changelog])

  // Обработчики действий
  const handleDownload = async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.download()
    }
  }

  const handleInstall = async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.install()
    }
  }

  const handleSkip = () => {
    if (status.updateInfo) {
      skipVersion(status.updateInfo.version)
      setOpen(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
  }

  // Если нет updateInfo, не показываем drawer
  if (!status.updateInfo) {
    return null
  }

  const { version, releaseDate, releaseNotes } = status.updateInfo
  const { status: updateStatus, downloadProgress, downloadSpeed, downloadEta } = status

  return (
    <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="end" size="md">
      <DrawerBackdrop />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Обновление приложения</DrawerTitle>
          <DrawerCloseTrigger />
        </DrawerHeader>

        <DrawerBody>
          <VStack align="stretch" gap="6">
            {/* Заголовок версии */}
            <Box p="4" bg="purple.subtle" borderRadius="lg" borderWidth="1px" borderColor="purple.muted">
              <HStack justify="space-between" mb="2">
                <HStack gap="2">
                  <Icon fontSize="xl" color="purple.fg" asChild>
                    <LuFileText />
                  </Icon>
                  <Text fontWeight="bold" fontSize="lg">
                    Animatrona v{version}
                  </Text>
                </HStack>
                <Badge colorPalette="purple" size="sm">
                  {updateStatus === 'available'
                    ? 'Доступно'
                    : updateStatus === 'downloading'
                      ? 'Загрузка'
                      : updateStatus === 'downloaded'
                        ? 'Готово'
                        : 'Готово к установке'}
                </Badge>
              </HStack>

              <HStack gap="4" color="fg.muted" fontSize="sm">
                <HStack gap="1">
                  <Icon fontSize="sm" asChild>
                    <LuCalendar />
                  </Icon>
                  <Text>
                    {new Date(releaseDate).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </HStack>
              </HStack>
            </Box>

            {/* Прогресс загрузки */}
            {updateStatus === 'downloading' && (
              <Box p="4" bg="bg.muted" borderRadius="lg">
                <VStack align="stretch" gap="3">
                  <Text fontWeight="semibold" fontSize="sm">
                    Загрузка...
                  </Text>
                  <Progress.Root value={downloadProgress} colorPalette="purple">
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                  <HStack justify="space-between" fontSize="sm" color="fg.muted">
                    <Text>{downloadProgress.toFixed(1)}%</Text>
                    <HStack gap="2">
                      {downloadSpeed > 0 && <Text>{(downloadSpeed / 1024 / 1024).toFixed(1)} МБ/с</Text>}
                      {downloadEta > 0 && <Text>~{Math.ceil(downloadEta)} сек</Text>}
                    </HStack>
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* Готово к установке */}
            {updateStatus === 'downloaded' && (
              <Box p="4" bg="green.subtle" borderRadius="lg" borderWidth="1px" borderColor="green.muted">
                <HStack gap="2" mb="2">
                  <Icon fontSize="xl" color="green.fg" asChild>
                    <LuDownload />
                  </Icon>
                  <Text fontWeight="semibold" color="green.fg">
                    Готово к установке
                  </Text>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  Приложение будет перезапущено для установки обновления
                </Text>
              </Box>
            )}

            {/* Changelog */}
            <Stack gap="3">
              <Text fontWeight="semibold" fontSize="md">
                Что нового
              </Text>

              {isLoadingChangelog ? (
                <VStack align="stretch" gap="2">
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                  <Skeleton height="20px" />
                </VStack>
              ) : changelog ? (
                <Box
                  fontSize="sm"
                  lineHeight="relaxed"
                  css={{
                    '& h1, & h2, & h3': {
                      fontWeight: 'semibold',
                      marginTop: '1rem',
                      marginBottom: '0.5rem',
                    },
                    '& ul, & ol': {
                      paddingLeft: '1.5rem',
                    },
                    '& li': {
                      marginBottom: '0.25rem',
                    },
                    '& p': {
                      marginBottom: '0.5rem',
                    },
                    '& code': {
                      backgroundColor: 'var(--chakra-colors-bg-muted)',
                      padding: '0.125rem 0.25rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.875em',
                    },
                  }}
                >
                  <ReactMarkdown>{changelog}</ReactMarkdown>
                </Box>
              ) : releaseNotes ? (
                <Box fontSize="sm" color="fg.muted">
                  <ReactMarkdown>{releaseNotes}</ReactMarkdown>
                </Box>
              ) : (
                <Text fontSize="sm" color="fg.muted">
                  Исправления ошибок и улучшения производительности
                </Text>
              )}
            </Stack>
          </VStack>
        </DrawerBody>

        <DrawerFooter>
          <HStack justify="space-between" w="full">
            {/* Пропустить версию */}
            {updateStatus === 'available' && (
              <Button variant="ghost" colorPalette="gray" size="sm" onClick={handleSkip}>
                Пропустить версию
              </Button>
            )}

            <HStack gap="2" ml="auto">
              {/* Позже / Закрыть */}
              <Button variant="outline" onClick={handleClose}>
                {updateStatus === 'downloading' ? 'Скрыть' : 'Позже'}
              </Button>

              {/* Скачать */}
              {updateStatus === 'available' && (
                <Button colorPalette="purple" onClick={handleDownload}>
                  <LuDownload />
                  Скачать
                </Button>
              )}

              {/* Отменить загрузку */}
              {updateStatus === 'downloading' && (
                <Button colorPalette="red" variant="outline" onClick={handleClose}>
                  <LuX />
                  Отменить
                </Button>
              )}

              {/* Установить */}
              {(updateStatus === 'downloaded' ||
                (updateStatus !== 'available' && updateStatus !== 'downloading' && updateStatus !== 'checking')) && (
                <Button colorPalette="purple" onClick={handleInstall}>
                  Установить сейчас
                </Button>
              )}
            </HStack>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer.Root>
  )
}
