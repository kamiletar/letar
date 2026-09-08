'use client'

/**
 * AudioTrackSelector — выбор аудиодорожки раздачи. В отличие от `animatrona-folder-player`
 * (встроенные в MKV дорожки через нативный `<video>.audioTracks`) здесь дорожки — отдельные
 * файлы в IPFS (`ReleaseEpisodeAudioTrack.cid`), переключаемые через `<audio src>` + `useAudioSync`.
 */

import { LuAudioLines } from 'react-icons/lu'

import type { TrackDropdownOption } from './TrackDropdownButton'
import { TrackDropdownButton } from './TrackDropdownButton'

export type AudioTrackOption = TrackDropdownOption

export interface AudioTrackSelectorProps {
  options: AudioTrackOption[]
  selectedId: string
  onSelect: (id: string) => void
}

export function AudioTrackSelector({ options, selectedId, onSelect }: AudioTrackSelectorProps) {
  return (
    <TrackDropdownButton
      ariaLabel="Аудиодорожка"
      tooltip="Аудиодорожка"
      icon={(color) => <LuAudioLines size={20} color={color} />}
      options={options}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  )
}
