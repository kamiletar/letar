'use client'

/**
 * Шаг конфигурации экспорта сериала
 */

import { Badge, Box, Button, Checkbox, Dialog, Flex, HStack, Icon, Tabs, Text, VStack } from '@chakra-ui/react'
import { closestCenter, DndContext } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LuCircleAlert, LuDownload, LuFolderOpen, LuGlobe, LuPlay, LuShare } from 'react-icons/lu'

import { NAMING_PATTERNS } from '@/animatrona-form'

import type { ExportSeriesDialogProps } from './export-types'
import { SortableTrackItem } from './SortableTrackItem'
import type { useExportDialogState } from './use-export-dialog-state'

/**
 * Props для ExportConfigStep
 */
export interface ExportConfigStepProps {
  state: ReturnType<typeof useExportDialogState>
  anime: ExportSeriesDialogProps['anime']
  onClose: () => void
}

/**
 * Компонент шага конфигурации экспорта
 */
export function ExportConfigStep({ state, anime, onClose }: ExportConfigStepProps) {
  return (
    <>
      <Dialog.Body>
        <VStack gap={4} align="stretch">
          {/* Выбор типа экспорта */}
          <Tabs.Root
            value={state.exportType}
            onValueChange={(e) => state.setExportType(e.value as 'mkv' | 'web')}
            variant="enclosed"
          >
            <Tabs.List>
              <Tabs.Trigger value="mkv">
                <Icon as={LuDownload} mr={2} />
                MKV
              </Tabs.Trigger>
              <Tabs.Trigger value="web">
                <Icon as={LuGlobe} mr={2} />
                Web Player
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          {/* Информация об аниме */}
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Text fontWeight="bold" fontSize="lg">
              {anime.name}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {state.readyEpisodes} из {anime.episodes.length} эпизодов готовы к экспорту
            </Text>
          </Box>

          {/* Предупреждение если не все эпизоды готовы */}
          {state.readyEpisodes < anime.episodes.length && (
            <Box p={3} bg="yellow.subtle" borderRadius="md">
              <HStack>
                <Icon as={LuCircleAlert} color="yellow.fg" />
                <Text color="yellow.fg" fontSize="sm">
                  Некоторые эпизоды не имеют готовых дорожек и будут пропущены
                </Text>
              </HStack>
            </Box>
          )}

          {/* Выбор эпизодов */}
          <Box>
            <HStack justify="space-between" mb={2}>
              <Text fontWeight="medium">
                Эпизоды ({state.selectedEpisodeNumbers.size} из {state.readyEpisodes}) *
              </Text>
              <HStack gap={1}>
                <Button size="xs" variant="ghost" onClick={state.selectAllEpisodes}>
                  Все
                </Button>
                <Button size="xs" variant="ghost" onClick={state.deselectAllEpisodes}>
                  Ни одного
                </Button>
              </HStack>
            </HStack>
            <Box maxH="120px" overflowY="auto" p={2} bg="bg.subtle" borderRadius="md">
              <Flex gap={2} wrap="wrap">
                {state.readyEpisodesList.map((ep) => (
                  <Checkbox.Root
                    key={ep.id}
                    size="sm"
                    checked={state.selectedEpisodeNumbers.has(ep.number)}
                    onCheckedChange={() => state.toggleEpisode(ep.number)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>
                      <Text fontSize="sm">{ep.number}</Text>
                    </Checkbox.Label>
                  </Checkbox.Root>
                ))}
              </Flex>
            </Box>
          </Box>

          {/* Выбор аудиодорожек */}
          <Box>
            <Text fontWeight="medium" mb={2}>
              Аудиодорожки * {state.selectedAudioKeys.length > 0 && `(${state.selectedAudioKeys.length} выбрано)`}
            </Text>
            <VStack align="stretch" gap={1}>
              {state.audioTracks.map((track) => (
                <Checkbox.Root
                  key={track.key}
                  checked={state.selectedAudioKeys.includes(track.key)}
                  onCheckedChange={() => state.toggleAudioTrack(track.key)}
                  disabled={!track.allReady}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    <HStack gap={2}>
                      <Badge colorPalette="blue" size="sm">
                        {track.language}
                      </Badge>
                      <Text>{track.title}</Text>
                      {track.codec && (
                        <Text color="fg.subtle" fontSize="xs">
                          ({track.codec})
                        </Text>
                      )}
                      <Text color="fg.subtle" fontSize="xs">
                        · {track.episodeCount} эп.
                      </Text>
                      {!track.allReady && (
                        <Badge colorPalette="yellow" size="sm">
                          Не все готовы
                        </Badge>
                      )}
                    </HStack>
                  </Checkbox.Label>
                </Checkbox.Root>
              ))}
              {state.audioTracks.length === 0 && (
                <Text color="fg.subtle" fontSize="sm">
                  Нет доступных аудиодорожек
                </Text>
              )}
            </VStack>
          </Box>

          {/* Порядок аудиодорожек (drag-and-drop) */}
          {state.selectedAudioKeys.length > 1 && (
            <Box>
              <Text fontWeight="medium" mb={1}>
                Порядок аудиодорожек
              </Text>
              <Text color="fg.subtle" fontSize="xs" mb={2}>
                Перетащите для изменения порядка. ★ = дорожка по умолчанию в плеере.
              </Text>
              <DndContext
                sensors={state.sensors}
                collisionDetection={closestCenter}
                onDragEnd={state.handleAudioDragEnd}
              >
                <SortableContext items={state.selectedAudioKeys} strategy={verticalListSortingStrategy}>
                  <VStack align="stretch" gap={1}>
                    {state.selectedAudioKeys.map((key) => {
                      const track = state.audioTracks.find((t) => t.key === key)
                      if (!track) {
                        return null
                      }
                      return (
                        <SortableTrackItem
                          key={key}
                          track={track}
                          isDefault={state.defaultAudioKey === key}
                          onSetDefault={() => state.setDefaultAudioKey(key)}
                          colorPalette="blue"
                          showDefaultButton={state.selectedAudioKeys.length > 1}
                        />
                      )
                    })}
                  </VStack>
                </SortableContext>
              </DndContext>
            </Box>
          )}

          {/* Выбор субтитров */}
          <Box>
            <Text fontWeight="medium" mb={2}>
              Субтитры (опционально){' '}
              {state.selectedSubtitleKeys.length > 0 && `(${state.selectedSubtitleKeys.length} выбрано)`}
            </Text>
            <VStack align="stretch" gap={1}>
              {state.subtitleTracks.map((track) => (
                <Checkbox.Root
                  key={track.key}
                  checked={state.selectedSubtitleKeys.includes(track.key)}
                  onCheckedChange={() => state.toggleSubtitleTrack(track.key)}
                  disabled={!track.allReady}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label>
                    <HStack gap={2}>
                      <Badge colorPalette="purple" size="sm">
                        {track.language}
                      </Badge>
                      <Text>{track.title}</Text>
                      {track.format && (
                        <Text color="fg.subtle" fontSize="xs">
                          ({track.format})
                        </Text>
                      )}
                      <Text color="fg.subtle" fontSize="xs">
                        · {track.episodeCount} эп.
                      </Text>
                      {!track.allReady && (
                        <Badge colorPalette="yellow" size="sm">
                          Не все готовы
                        </Badge>
                      )}
                    </HStack>
                  </Checkbox.Label>
                </Checkbox.Root>
              ))}
              {state.subtitleTracks.length === 0 && (
                <Text color="fg.subtle" fontSize="sm">
                  Нет доступных субтитров
                </Text>
              )}
            </VStack>
          </Box>

          {/* Порядок субтитров (drag-and-drop) */}
          {state.selectedSubtitleKeys.length > 1 && (
            <Box>
              <Text fontWeight="medium" mb={1}>
                Порядок субтитров
              </Text>
              <Text color="fg.subtle" fontSize="xs" mb={2}>
                Перетащите для изменения порядка. ★ = субтитры по умолчанию (авто-включатся в плеере).
              </Text>
              <DndContext
                sensors={state.sensors}
                collisionDetection={closestCenter}
                onDragEnd={state.handleSubtitleDragEnd}
              >
                <SortableContext items={state.selectedSubtitleKeys} strategy={verticalListSortingStrategy}>
                  <VStack align="stretch" gap={1}>
                    {state.selectedSubtitleKeys.map((key) => {
                      const track = state.subtitleTracks.find((t) => t.key === key)
                      if (!track) {
                        return null
                      }
                      return (
                        <SortableTrackItem
                          key={key}
                          track={track}
                          isDefault={state.defaultSubtitleKey === key}
                          onSetDefault={() =>
                            state.setDefaultSubtitleKey(state.defaultSubtitleKey === key ? null : key)}
                          colorPalette="purple"
                          showDefaultButton
                        />
                      )
                    })}
                  </VStack>
                </SortableContext>
              </DndContext>
            </Box>
          )}

          {/* Папка назначения (не показывается для publish режима Web Player) */}
          {!(state.exportType === 'web' && state.webResourceMode === 'publish') && (
            <Box>
              <Text fontWeight="medium" mb={2}>
                Папка назначения *
              </Text>
              <HStack>
                <Box flex={1} p={2} bg="bg.subtle" borderRadius="md" minH="40px" display="flex" alignItems="center">
                  <Text color={state.outputDir ? 'white' : 'fg.subtle'} fontSize="sm" truncate>
                    {state.outputDir || 'Выберите папку...'}
                  </Text>
                </Box>
                <Button variant="outline" onClick={state.handleSelectFolder}>
                  <Icon as={LuFolderOpen} mr={2} />
                  Обзор
                </Button>
              </HStack>
            </Box>
          )}

          {/* MKV-специфичные опции */}
          {state.exportType === 'mkv' && (
            <>
              {/* Паттерн именования */}
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Паттерн именования
                </Text>
                <VStack align="stretch" gap={1}>
                  {NAMING_PATTERNS.map((pattern) => (
                    <Checkbox.Root
                      key={pattern.value}
                      checked={state.namingPattern === pattern.value}
                      onCheckedChange={() => state.setNamingPattern(pattern.value)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control borderRadius="full" />
                      <Checkbox.Label>
                        <Text>{pattern.label}</Text>
                      </Checkbox.Label>
                    </Checkbox.Root>
                  ))}
                </VStack>
              </Box>

              {/* Опции экспорта */}
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Опции
                </Text>
                <VStack align="stretch" gap={2}>
                  <Checkbox.Root
                    checked={state.createFolderStructure}
                    onCheckedChange={(e) => state.setCreateFolderStructure(!!e.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>
                      <Text>Создать структуру папок</Text>
                    </Checkbox.Label>
                  </Checkbox.Root>
                  <Checkbox.Root
                    checked={state.openFolderAfterExport}
                    onCheckedChange={(e) => state.setOpenFolderAfterExport(!!e.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>
                      <Text>Открыть папку после экспорта</Text>
                    </Checkbox.Label>
                  </Checkbox.Root>
                </VStack>
              </Box>

              {/* Preview */}
              <Box p={3} bg="bg.subtle" borderRadius="md">
                <Text fontWeight="medium" fontSize="sm" mb={2}>
                  Пример:
                </Text>
                {state.previewInfo.folderPath && (
                  <Text fontSize="xs" color="fg.muted" mb={1}>
                    📁 {state.outputDir || '...'}/{state.previewInfo.folderPath}
                  </Text>
                )}
                <Text fontSize="sm" color="purple.300">
                  {state.previewInfo.folderPath ? '└── ' : ''}
                  {state.previewInfo.sampleFileName}
                </Text>
              </Box>
            </>
          )}

          {/* Web Player-специфичные опции */}
          {state.exportType === 'web' && (
            <Box p={3} bg="purple.subtle" borderRadius="md">
              <HStack align="start" gap={2}>
                <Icon as={LuGlobe} color="purple.fg" mt={1} />
                <VStack align="start" gap={1}>
                  <Text fontWeight="medium" color="purple.fg" fontSize="sm">
                    Web Player
                  </Text>
                  <Text fontSize="xs" color="purple.fg" opacity={0.8}>
                    Создаёт standalone HTML плеер с выбранными эпизодами и публикует в IPFS. Получите CID для шеринга.
                  </Text>
                </VStack>
              </HStack>
            </Box>
          )}
        </VStack>
      </Dialog.Body>

      <Dialog.Footer>
        <HStack gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            colorPalette="purple"
            onClick={state.exportType === 'mkv' ? state.handleStartExport : state.handleStartWebExport}
          >
            <Icon as={state.exportType === 'mkv' ? LuPlay : LuShare} mr={2} />
            {state.exportType === 'mkv' ? 'Экспортировать MKV' : 'Опубликовать в IPFS'}
          </Button>
        </HStack>
      </Dialog.Footer>
    </>
  )
}
