'use client'

import { Box, Button, Heading, HStack, Icon, Menu, Portal, SegmentGroup, Spinner, Text, VStack } from '@chakra-ui/react'
import nextDynamic from 'next/dynamic'
import { Component, type ErrorInfo, type ReactNode, Suspense, useState } from 'react'
import {
  LuAudioLines,
  LuChevronDown,
  LuCopyX,
  LuGlobe,
  LuGrid2X2,
  LuImport,
  LuLayers,
  LuRefreshCw,
  LuSquareCheck,
  LuTriangleAlert,
  LuWrench,
} from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

import { Header } from '@/components/layout'
import { AnimeFilters, AnimeGrid, BatchActionsBar, DropZone, EmptyLibraryState } from '@/components/library'

import { FranchiseView, useLibraryPage, useScrollRestoration } from './_lib'

// Dynamic imports для диалогов — загружаются только при открытии
const ImportWizardDialog = nextDynamic(
  () => import('@/components/import/ImportWizardDialog').then((mod) => mod.ImportWizardDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)

const DeleteAnimeDialog = nextDynamic(
  () => import('@/components/library/DeleteAnimeDialog').then((mod) => mod.DeleteAnimeDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)

const BatchPublishDialog = nextDynamic(
  () => import('@/components/library/batch-publish').then((mod) => mod.BatchPublishDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)

const BatchReencodeDialog = nextDynamic(
  () => import('@/components/library/reencode/BatchReencodeDialog').then((mod) => mod.BatchReencodeDialog),
  { ssr: false, loading: () => <Spinner size="lg" color="purple.500" /> }
)

// Отключаем статическую генерацию для страницы библиотеки
export const dynamic = 'force-dynamic'

/**
 * ErrorBoundary для сетки карточек — ловит ошибки рендеринга карточек
 * без крашинга всей страницы библиотеки
 */
interface GridErrorBoundaryProps {
  children: ReactNode
}

interface GridErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class GridErrorBoundary extends Component<GridErrorBoundaryProps, GridErrorBoundaryState> {
  constructor(props: GridErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): GridErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Library Grid] Ошибка рендеринга:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Box textAlign="center" py={12} px={4}>
          <VStack gap={4}>
            <Icon as={LuTriangleAlert} boxSize={10} color="orange.500" />
            <Text color="fg.muted">Ошибка отображения списка аниме</Text>
            <Button size="sm" variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
              <Icon as={LuRefreshCw} mr={1} />
              Попробовать снова
            </Button>
          </VStack>
        </Box>
      )
    }

    return this.props.children
  }
}

/**
 * Внутренний компонент страницы библиотеки
 * Выделен для Suspense boundary (useSearchParams требует Suspense)
 */
function LibraryPageContent() {
  const {
    // State
    isImportOpen,
    setIsImportOpen,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    isBatchPublishOpen,
    setIsBatchPublishOpen,
    isBatchReencodeOpen,
    setIsBatchReencodeOpen,
    setSelectedAnimeId,
    droppedFolderPath,
    viewMode,

    // Данные
    animes,
    genres,
    franchiseGroups,
    standAloneAnimes,
    isLoading,
    isEmptyWithoutFilters,
    selectedAnime,

    // Фильтры
    searchInput,
    setSearchInput,
    urlParams,
    setParam,
    setParams,
    filterCounts,
    isLoadingCounts,
    // v0.28.0: studiosData и directorsData удалены
    dubGroupsData,

    // Handlers
    handleFolderDrop,
    handleImportOpenChange,
    handleViewModeChange,
    handleReset,
    handleCardPlay,
    handleCardExport,
    handleCardRefreshMetadata,
    handleCardDelete,
    handleWatchStatusChange,
    refetch,

    // Batch selection
    selectionMode,
    setSelectionMode,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    isBatchUpdating,
    batchProgress,
    handleBatchWatchStatus,
    handleBatchUnpin,
  } = useLibraryPage()

  // Восстановление позиции скролла при возврате из деталей аниме
  useScrollRestoration(!isLoading, viewMode)

  // Дедупликация дорожек (кнопка в дропдауне «Обслуживание»)
  const [isDeduplicating, setIsDeduplicating] = useState(false)
  const handleDeduplicateTracks = async () => {
    if (!window.electronAPI?.animeManifest) {
      toaster.error({ title: 'API недоступен' })
      return
    }
    setIsDeduplicating(true)
    try {
      const response = await window.electronAPI.animeManifest.deduplicateTracks()
      if (response.success && response.data) {
        const { audioRemoved, subtitlesRemoved, fontsRemoved } = response.data
        const total = audioRemoved + subtitlesRemoved + fontsRemoved
        if (total === 0) {
          toaster.success({
            title: 'Дубликатов не найдено',
            description: 'Все дорожки в порядке',
          })
        } else {
          toaster.success({
            title: `Удалено дубликатов: ${total}`,
            description: `Аудио: ${audioRemoved}, субтитры: ${subtitlesRemoved}, шрифты: ${fontsRemoved}. Рекомендуется регенерировать манифесты.`,
          })
          await refetch()
        }
      } else {
        toaster.error({
          title: 'Ошибка дедупликации',
          description: response.error ?? 'Неизвестная ошибка',
        })
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка дедупликации',
        description: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsDeduplicating(false)
    }
  }

  const {
    status,
    yearMin,
    yearMax,
    genre,
    studio,
    fandubber,
    director,
    episodesMin,
    episodesMax,
    resolution,
    bitDepth,
    sortBy,
    watchStatus: watchStatusFilter,
    pinnedStatus: pinnedStatusFilter,
    reuploadStatus: reuploadStatusFilter,
    ageRatingFilter,
  } = urlParams

  return (
    <DropZone onFolderDrop={handleFolderDrop}>
      <Box minH="100vh" bg="bg" color="fg">
        <Header title="Библиотека" />

        <Box p={6}>
          <VStack gap={6} align="stretch">
            {/* Заголовок и действия */}
            <HStack justify="space-between">
              <Box>
                <Heading size="lg">Библиотека аниме</Heading>
                <Text color="fg.subtle">{animes.length} тайтлов в коллекции</Text>
              </Box>
              <HStack gap={2}>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <Icon as={LuRefreshCw} mr={2} />
                  Обновить
                </Button>

                <Button
                  variant={selectionMode ? 'solid' : 'outline'}
                  colorPalette={selectionMode ? 'purple' : 'gray'}
                  size="sm"
                  onClick={() => {
                    if (selectionMode) clearSelection()
                    else setSelectionMode(true)
                  }}
                >
                  <Icon as={LuSquareCheck} mr={2} />
                  {selectionMode ? `Выбрано ${selectedIds.size}` : 'Выбрать'}
                </Button>

                {/* Дропдаун обслуживания библиотеки */}
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <Button variant="outline" size="sm" disabled={isDeduplicating}>
                      <Icon as={LuWrench} mr={2} />
                      Обслуживание
                      <Icon as={LuChevronDown} ml={2} />
                    </Button>
                  </Menu.Trigger>
                  <Portal>
                    <Menu.Positioner>
                      <Menu.Content minW="240px">
                        <Menu.Item value="batch-reencode" onClick={() => setIsBatchReencodeOpen(true)}>
                          <Icon as={LuAudioLines} />
                          Пережать аудио
                        </Menu.Item>
                        <Menu.Item value="batch-publish" onClick={() => setIsBatchPublishOpen(true)}>
                          <Icon as={LuGlobe} />
                          Опубликовать на трекер
                        </Menu.Item>
                        <Menu.Item
                          value="deduplicate-tracks"
                          onClick={() => void handleDeduplicateTracks()}
                          disabled={isDeduplicating}
                        >
                          <Icon as={LuCopyX} />
                          {isDeduplicating ? 'Дедупликация...' : 'Дедуплицировать дорожки'}
                        </Menu.Item>
                      </Menu.Content>
                    </Menu.Positioner>
                  </Portal>
                </Menu.Root>

                <Button colorPalette="purple" size="sm" onClick={() => setIsImportOpen(true)}>
                  <Icon as={LuImport} mr={2} />
                  Импорт видео
                </Button>
              </HStack>
            </HStack>

            {/* Переключатель режима отображения */}
            <SegmentGroup.Root value={viewMode} onValueChange={handleViewModeChange} size="sm">
              <SegmentGroup.Indicator />
              <SegmentGroup.Item value="individual">
                <SegmentGroup.ItemText>
                  <HStack gap={1}>
                    <Icon as={LuGrid2X2} boxSize={4} />
                    <Text>По отдельности</Text>
                  </HStack>
                </SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
              <SegmentGroup.Item value="franchise">
                <SegmentGroup.ItemText>
                  <HStack gap={1}>
                    <Icon as={LuLayers} boxSize={4} />
                    <Text>По франшизам</Text>
                  </HStack>
                </SegmentGroup.ItemText>
                <SegmentGroup.ItemHiddenInput />
              </SegmentGroup.Item>
            </SegmentGroup.Root>

            {/* Фильтры */}
            <AnimeFilters
              search={searchInput}
              onSearchChange={setSearchInput}
              status={status}
              onStatusChange={(v) => setParam('status', v)}
              yearMin={yearMin}
              onYearMinChange={(v) => setParam('yearMin', v)}
              yearMax={yearMax}
              onYearMaxChange={(v) => setParam('yearMax', v)}
              onYearRangeClear={() => setParams({ yearMin: '', yearMax: '' })}
              genre={genre}
              onGenreChange={(v) => setParam('genre', v)}
              genres={genres}
              // Расширенные фильтры
              studio={studio}
              onStudioChange={(v) => setParam('studio', v)}
              studios={[]} // v0.28.0: студии теперь в AnimeManifest (IPFS)
              fandubber={fandubber}
              onFandubberChange={(v) => setParam('fandubber', v)}
              fandubbers={dubGroupsData}
              director={director}
              onDirectorChange={(v) => setParam('director', v)}
              directors={[]} // v0.28.0: режиссёры теперь в AnimeManifest (IPFS)
              episodesMin={episodesMin}
              onEpisodesMinChange={(v) => setParam('episodesMin', v)}
              episodesMax={episodesMax}
              onEpisodesMaxChange={(v) => setParam('episodesMax', v)}
              onEpisodesRangeClear={() => setParams({ episodesMin: '', episodesMax: '' })}
              // Фильтры качества
              resolution={resolution}
              onResolutionChange={(v) => setParam('resolution', v)}
              bitDepth={bitDepth}
              onBitDepthChange={(v) => setParam('bitDepth', v)}
              onQualityClear={() => setParams({ resolution: '', bitDepth: '' })}
              // Сортировка
              sortBy={sortBy}
              onSortChange={(v) => setParam('sortBy', v)}
              // Статус просмотра
              watchStatus={watchStatusFilter}
              onWatchStatusChange={(v) => setParam('watchStatus', v)}
              pinnedStatus={pinnedStatusFilter}
              onPinnedStatusChange={(v) => setParam('pinnedStatus', v)}
              reuploadStatus={reuploadStatusFilter}
              onReuploadStatusChange={(v) => setParam('reuploadStatus', v)}
              ageRatingFilter={ageRatingFilter}
              onAgeRatingFilterChange={(v) => setParam('ageRatingFilter', v)}
              onReset={handleReset}
              // Количество результатов для mobile
              resultCount={animes.length}
              // Faceted counts
              counts={filterCounts}
              isLoadingCounts={isLoadingCounts}
            />

            {/* Панель пакетных действий (появляется в режиме выбора) */}
            {selectionMode && (
              <BatchActionsBar
                selectedCount={selectedIds.size}
                totalCount={animes.length}
                isBatchUpdating={isBatchUpdating}
                batchProgress={batchProgress}
                onSelectAll={() => toggleSelectAll(animes.map((a) => a.id))}
                onClearSelection={clearSelection}
                onBatchWatchStatus={handleBatchWatchStatus}
                onBatchUnpin={handleBatchUnpin}
              />
            )}

            {/* Сетка аниме — зависит от режима отображения */}
            <GridErrorBoundary>
              {isEmptyWithoutFilters ? (
                <EmptyLibraryState onImport={() => setIsImportOpen(true)} />
              ) : viewMode === 'individual' ? (
                <AnimeGrid
                  animes={animes}
                  isLoading={isLoading}
                  onPlay={handleCardPlay}
                  onExport={handleCardExport}
                  onRefreshMetadata={handleCardRefreshMetadata}
                  onDelete={handleCardDelete}
                  onWatchStatusChange={handleWatchStatusChange}
                  selectionMode={selectionMode}
                  selectedIds={selectedIds}
                  onToggleSelection={toggleSelection}
                />
              ) : (
                <FranchiseView
                  franchiseGroups={franchiseGroups}
                  standAloneAnimes={standAloneAnimes}
                  isLoading={isLoading}
                  onPlay={handleCardPlay}
                  onExport={handleCardExport}
                  onRefreshMetadata={handleCardRefreshMetadata}
                  onDelete={handleCardDelete}
                  onWatchStatusChange={handleWatchStatusChange}
                />
              )}
            </GridErrorBoundary>
          </VStack>
        </Box>

        {/* Визард импорта видео — условный рендер */}
        {isImportOpen && (
          <ImportWizardDialog
            open={isImportOpen}
            onOpenChange={handleImportOpenChange}
            initialFolderPath={droppedFolderPath}
          />
        )}

        {/* Диалог удаления аниме */}
        {selectedAnime && (
          <DeleteAnimeDialog
            open={isDeleteDialogOpen}
            onOpenChange={(open) => {
              setIsDeleteDialogOpen(open)
              if (!open) {
                setSelectedAnimeId(null)
              }
            }}
            anime={{
              id: selectedAnime.id,
              name: selectedAnime.name,
              episodeCount: selectedAnime.episodeCount,
            }}
            onDeleted={() => {
              setSelectedAnimeId(null)
              refetch()
            }}
          />
        )}

        {/* Диалог пакетной публикации — условный рендер */}
        {isBatchPublishOpen && (
          <BatchPublishDialog
            open={isBatchPublishOpen}
            onOpenChange={setIsBatchPublishOpen}
            animes={animes.map((a) => ({
              id: a.id,
              name: a.name,
              directoryCid: a.directoryCid ?? null,
              trackerPublishedAt: a.trackerPublishedAt ?? null,
              trackerPublishedCid: a.trackerPublishedCid ?? null,
              watchStatus: a.watchStatus ?? 'NOT_STARTED',
            }))}
            onPublished={() => refetch()}
          />
        )}

        {/* Диалог пакетной перекодировки аудио — условный рендер */}
        {isBatchReencodeOpen && (
          <BatchReencodeDialog
            open={isBatchReencodeOpen}
            onOpenChange={setIsBatchReencodeOpen}
            onCompleted={() => refetch()}
          />
        )}
      </Box>
    </DropZone>
  )
}

/**
 * Страница библиотеки аниме с Suspense boundary
 */
export default function LibraryPage() {
  return (
    <Suspense
      fallback={
        <Box minH="100vh" bg="bg" color="fg" display="flex" alignItems="center" justifyContent="center">
          <VStack gap={4}>
            <Spinner size="xl" color="purple.500" />
            <Text color="fg.muted">Загрузка библиотеки...</Text>
          </VStack>
        </Box>
      }
    >
      <LibraryPageContent />
    </Suspense>
  )
}
