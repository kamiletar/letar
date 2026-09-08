'use client'

/**
 * AudioTrackSelector — выбор аудиодорожки из уже загруженного файла (см. `useAudioTracks`
 * в `@letar/video-player-react` — режим `src=` Shaka, встроенные в MKV дорожки).
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
