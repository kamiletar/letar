'use client'

/**
 * Dropdown меню с действиями для аниме
 *
 * Заменяет вертикальный список кнопок на компактное меню
 */

import { IconButton, Menu, Portal } from '@chakra-ui/react'
import {
  LuAudioLines,
  LuCloudUpload,
  LuCopy,
  LuDownload,
  LuEllipsisVertical,
  LuExternalLink,
  LuFilePlus,
  LuGlobe,
  LuHardDrive,
  LuMusic,
  LuPencil,
  LuRefreshCw,
  LuTrash2,
  LuWrench,
} from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'

import { WatchStatusSubmenu } from '../WatchStatusSubmenu'

export interface ActionMenuProps {
  /** Есть ли эпизоды (для условного отображения некоторых пунктов) */
  hasEpisodes: boolean
  /** Есть ли shikimoriId (для обновления метаданных) */
  hasShikimoriId?: boolean
  /** Есть ли directoryCid (для публикации на трекер) */
  hasDirectoryCid?: boolean
  /** Directory CID для копирования в буфер обмена */
  directoryCid?: string
  /** Идёт ли загрузка метаданных */
  isRefreshingMetadata?: boolean
  /** Идёт ли публикация на трекер */
  isPublishingToTracker?: boolean
  /** Текущий статус просмотра */
  watchStatus?: WatchStatus
  /** Callback для редактирования */
  onEdit: () => void
  /** Callback для экспорта */
  onExport: () => void
  /** Callback для добавления дорожек */
  onAddTracks: () => void
  /** Callback для удаления */
  onDelete: () => void
  /** Callback для обновления метаданных из Shikimori */
  onRefreshMetadata?: () => void
  /** Callback для изменения статуса просмотра */
  onWatchStatusChange?: (status: WatchStatus) => void
  /** Callback для публикации на трекер */
  onPublishToTracker?: () => void
  /** Количество эпизодов (для условия >= 2 для определения OP/ED) */
  episodeCount?: number
  /** Идёт ли определение OP/ED */
  isDetectingIntros?: boolean
  /** Callback для определения OP/ED */
  onDetectIntros?: () => void
  /** Есть ли битые/отсутствующие дорожки */
  hasBrokenTracks?: boolean
  /** Callback для восстановления дорожек */
  onRestoreTracks?: () => void
  /** URL источника раздачи (Rutracker и т.д.) */
  sourceUrl?: string
  /** Callback для перекодировки аудио */
  onReencodeAudio?: () => void
  /** Контент запинен локально */
  pinnedLocally?: boolean
  /** Идёт ли откреплениe */
  isUnpinning?: boolean
  /** Идёт ли закреплениe */
  isRepinning?: boolean
  /** Callback для откреплениe с диска */
  onUnpin?: () => void
  /** Callback для закреплениe на диск */
  onRepin?: () => void
  /** Идёт ли синхронизация новых эпизодов */
  isSyncingEpisodes?: boolean
  /** Callback для загрузки новых серий из IPFS (для онгоингов) */
  onSyncEpisodes?: () => void
  /** Callback для добавления/замены эпизодов через encode wizard */
  onAddEpisodes?: () => void
}

export function ActionMenu({
  hasEpisodes,
  hasShikimoriId,
  hasDirectoryCid,
  directoryCid,
  isRefreshingMetadata,
  isPublishingToTracker,
  watchStatus = 'NOT_STARTED',
  onEdit,
  onExport,
  onAddTracks,
  onDelete,
  onRefreshMetadata,
  onWatchStatusChange,
  onPublishToTracker,
  episodeCount = 0,
  isDetectingIntros,
  onDetectIntros,
  hasBrokenTracks,
  onRestoreTracks,
  sourceUrl,
  onReencodeAudio,
  pinnedLocally,
  isUnpinning,
  isRepinning,
  onUnpin,
  onRepin,
  isSyncingEpisodes,
  onSyncEpisodes,
  onAddEpisodes,
}: ActionMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <IconButton variant="outline" size={{ base: 'md', md: 'lg' }} aria-label="Действия">
          <LuEllipsisVertical />
        </IconButton>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="200px">
            {/* Подменю статуса просмотра */}
            {onWatchStatusChange && (
              <>
                <WatchStatusSubmenu watchStatus={watchStatus} onWatchStatusChange={onWatchStatusChange} />
                <Menu.Separator />
              </>
            )}

            <Menu.Item value="edit" onClick={onEdit}>
              <LuPencil />
              Редактировать
            </Menu.Item>

            {hasShikimoriId && onRefreshMetadata && (
              <Menu.Item value="refresh-metadata" onClick={onRefreshMetadata} disabled={isRefreshingMetadata}>
                <LuRefreshCw
                  style={isRefreshingMetadata ? { animation: 'spin 1s linear infinite' } : undefined}
                />
                {isRefreshingMetadata ? 'Обновление...' : 'Обновить метаданные'}
              </Menu.Item>
            )}

            {onAddEpisodes && (
              <Menu.Item value="add-episodes" onClick={onAddEpisodes}>
                <LuFilePlus />
                Добавить эпизоды
              </Menu.Item>
            )}

            {hasEpisodes && (
              <>
                <Menu.Item value="export" onClick={onExport}>
                  <LuDownload />
                  Экспорт
                </Menu.Item>

                <Menu.Item value="add-tracks" onClick={onAddTracks}>
                  <LuMusic />
                  Добавить дорожки
                </Menu.Item>

                {hasBrokenTracks && onRestoreTracks && (
                  <Menu.Item value="restore-tracks" onClick={onRestoreTracks}>
                    <LuWrench />
                    Восстановить дорожки
                  </Menu.Item>
                )}

                {episodeCount >= 2 && onDetectIntros && (
                  <Menu.Item value="detect-intros" onClick={onDetectIntros} disabled={isDetectingIntros}>
                    <LuAudioLines
                      style={isDetectingIntros ? { animation: 'spin 1s linear infinite' } : undefined}
                    />
                    {isDetectingIntros ? 'Определение OP/ED...' : 'Определить OP/ED'}
                  </Menu.Item>
                )}
              </>
            )}

            {hasEpisodes && onReencodeAudio && (
              <Menu.Item value="reencode-audio" onClick={onReencodeAudio}>
                <LuAudioLines />
                Пережать аудио
              </Menu.Item>
            )}

            {hasDirectoryCid && onPublishToTracker && (
              <Menu.Item value="publish-tracker" onClick={onPublishToTracker} disabled={isPublishingToTracker}>
                <LuGlobe
                  style={isPublishingToTracker ? { animation: 'spin 1s linear infinite' } : undefined}
                />
                {isPublishingToTracker ? 'Публикация...' : 'Опубликовать на трекер'}
              </Menu.Item>
            )}

            {directoryCid && (
              <Menu.Item
                value="copy-directory-cid"
                onClick={() => {
                  void navigator.clipboard.writeText(directoryCid)
                }}
              >
                <LuCopy />
                Скопировать Directory CID
              </Menu.Item>
            )}

            {sourceUrl && (
              <>
                <Menu.Separator />
                <Menu.Item value="open-source" onClick={() => window.electronAPI?.app?.openExternal(sourceUrl)}>
                  <LuExternalLink />
                  Источник (Rutracker)
                </Menu.Item>
              </>
            )}

            {/* Управление хранилищем */}
            {pinnedLocally && onUnpin && (
              <Menu.Item value="unpin" onClick={onUnpin} disabled={isUnpinning}>
                <LuCloudUpload style={isUnpinning ? { animation: 'spin 1s linear infinite' } : undefined} />
                {isUnpinning ? 'Откреплениe...' : 'Отпинить с диска'}
              </Menu.Item>
            )}

            {pinnedLocally === false && onRepin && (
              <Menu.Item value="repin" onClick={onRepin} disabled={isRepinning}>
                <LuHardDrive style={isRepinning ? { animation: 'spin 1s linear infinite' } : undefined} />
                {isRepinning ? 'Закреплениe...' : 'Запинить на диск'}
              </Menu.Item>
            )}

            {hasDirectoryCid && onSyncEpisodes && (
              <Menu.Item value="sync-episodes" onClick={onSyncEpisodes} disabled={isSyncingEpisodes}>
                <LuRefreshCw
                  style={isSyncingEpisodes ? { animation: 'spin 1s linear infinite' } : undefined}
                />
                {isSyncingEpisodes ? 'Загрузка серий...' : 'Загрузить новые серии'}
              </Menu.Item>
            )}

            <Menu.Separator />

            <Menu.Item value="delete" color="fg.error" onClick={onDelete}>
              <LuTrash2 />
              Удалить
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
