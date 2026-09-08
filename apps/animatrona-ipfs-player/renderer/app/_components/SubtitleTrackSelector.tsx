'use client'

/**
 * SubtitleTrackSelector — выбор дорожки субтитров эпизода (первый пункт — «Выключены»).
 */

import { LuCaptions } from 'react-icons/lu'

import type { TrackDropdownOption } from './TrackDropdownButton'
import { TrackDropdownButton } from './TrackDropdownButton'

export type SubtitleTrackOption = TrackDropdownOption

export interface SubtitleTrackSelectorProps {
  options: SubtitleTrackOption[]
  selectedId: string
  onSelect: (id: string) => void
}

export function SubtitleTrackSelector({ options, selectedId, onSelect }: SubtitleTrackSelectorProps) {
  return (
    <TrackDropdownButton
      ariaLabel="Субтитры"
      tooltip="Субтитры"
      icon={(color) => <LuCaptions size={20} color={color} />}
      options={options}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  )
}
