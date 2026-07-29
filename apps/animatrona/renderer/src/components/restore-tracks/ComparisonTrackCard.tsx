'use client'

/**
 * Карточка дорожки для ComparisonStep — read-only отображение
 *
 * Показывает статус (✅ есть / ⚠️ отсутствует), тип, язык, кодек, каналы.
 * Без checkbox/click — чисто информационная.
 */

import { Badge, HStack, Icon, Text } from '@chakra-ui/react'
import { LuCaptions, LuCheck, LuMusic, LuTriangleAlert, LuType } from 'react-icons/lu'

import type { TrackInfo } from '@/lib/add-tracks'

/** Название языка по ISO 639-2/3 коду */
function getLanguageName(langCode: string): string {
  const names: Record<string, string> = {
    rus: 'Русский',
    ru: 'Русский',
    eng: 'Английский',
    en: 'Английский',
    jpn: 'Японский',
    ja: 'Японский',
    ger: 'Немецкий',
    de: 'Немецкий',
    fre: 'Французский',
    fr: 'Французский',
    und: 'Неизвестный',
  }
  return names[langCode.toLowerCase()] || langCode
}

/** Техническая информация: кодек · каналы · битрейт */
function formatTrackDetails(track: TrackInfo, type: 'audio' | 'subtitle'): string {
  const parts: string[] = []

  if (type === 'audio') {
    if (track.codec) {
      parts.push(track.codec.toUpperCase())
    }
    if (track.channels) {
      if (track.channels === 2) {
        parts.push('2.0')
      } else if (track.channels === 6) {
        parts.push('5.1')
      } else if (track.channels === 8) {
        parts.push('7.1')
      } else {
        parts.push(`${track.channels}ch`)
      }
    }
    if (track.bitrate) {
      parts.push(`${Math.round(track.bitrate / 1000)}kbps`)
    }
  } else {
    // Субтитры: формат
    if (track.format || track.codec) {
      parts.push((track.format || track.codec).toUpperCase())
    }
  }

  return parts.join(' · ')
}

interface DonorTrackCardProps {
  track: TrackInfo
  type: 'audio' | 'subtitle'
  /** true = отсутствует в библиотеке (оранжевый), false = уже есть (зелёный) */
  isMissing: boolean
}

/** Карточка дорожки с индикатором статуса */
export function DonorTrackCard({ track, type, isMissing }: DonorTrackCardProps) {
  const details = formatTrackDetails(track, type)
  const langName = getLanguageName(track.language)
  const title = track.title && track.title !== langName ? track.title : null

  return (
    <HStack gap={2} py={1} px={2} borderRadius="sm" bg={isMissing ? 'orange.subtle' : 'green.subtle'} fontSize="xs">
      {/* Статус */}
      <Icon
        as={isMissing ? LuTriangleAlert : LuCheck}
        color={isMissing ? 'orange.fg' : 'green.fg'}
        boxSize={3.5}
        flexShrink={0}
      />

      {/* Иконка типа */}
      <Icon as={type === 'audio' ? LuMusic : LuCaptions} color="fg.subtle" boxSize={3.5} flexShrink={0} />

      {/* Язык и название */}
      <Text color="fg" fontWeight="medium" flexShrink={0}>
        {langName}
      </Text>
      {title && (
        <Text color="fg.muted" truncate>
          {title}
        </Text>
      )}

      {/* Детали: кодек · каналы · битрейт */}
      {details && (
        <Text color="fg.subtle" flexShrink={0}>
          — {details}
        </Text>
      )}

      {/* Spacer */}
      <Text flex={1} />

      {/* Бейджи: dubGroup, шрифты */}
      {track.dubGroup && (
        <Badge size="sm" variant="outline" colorPalette="purple" flexShrink={0}>
          {track.dubGroup}
        </Badge>
      )}
      {type === 'subtitle' && track.matchedFonts && track.matchedFonts.length > 0 && (
        <Badge size="sm" variant="subtle" colorPalette="blue" flexShrink={0}>
          <Icon as={LuType} boxSize={3} mr={0.5} />
          {track.matchedFonts.length}
        </Badge>
      )}
    </HStack>
  )
}
