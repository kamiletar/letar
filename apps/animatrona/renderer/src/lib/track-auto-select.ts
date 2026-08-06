/**
 * Автовыбор аудио/субтитров дорожек на основе предпочтений пользователя
 */

import type { TrackPreference } from '@/generated/prisma'

interface AudioTrack {
  id: string
  language: string
  title?: string | null
  dubGroup?: string | null
  /** CID в IPFS — дорожка готова к воспроизведению */
  transcodedCid?: string | null
}

interface SubtitleTrack {
  id: string
  language: string
  title?: string | null
  dubGroup?: string | null
}

/** Языки которые считаются "оригиналом" */
const ORIGINAL_LANGUAGES = ['ja', 'jpn', 'japanese', 'en', 'eng', 'english']

/** Языки которые считаются "русскими" */
const RUSSIAN_LANGUAGES = ['ru', 'rus', 'russian']

/**
 * Проверяет является ли дорожка русской
 */
function isRussianTrack(track: { language: string; title?: string | null }): boolean {
  const lang = track.language.toLowerCase()
  if (RUSSIAN_LANGUAGES.includes(lang)) {
    return true
  }

  // Проверяем title на русские слова
  const title = track.title?.toLowerCase() || ''
  if (title.includes('рус') || title.includes('rus')) {
    return true
  }

  return false
}

/**
 * Проверяет является ли дорожка оригинальной (японская/английская)
 */
function isOriginalTrack(track: { language: string }): boolean {
  const lang = track.language.toLowerCase()
  return ORIGINAL_LANGUAGES.includes(lang)
}

/**
 * Проверяет являются ли субтитры "надписями" (signs)
 */
function isSignsSubtitle(track: SubtitleTrack): boolean {
  const title = track.title?.toLowerCase() || ''
  const dubGroup = track.dubGroup?.toLowerCase() || ''

  return title.includes('sign') || title.includes('надпис') || dubGroup.includes('sign') || dubGroup.includes('надпис')
}

/**
 * Проверяет являются ли субтитры "полными"
 */
function isFullSubtitle(track: SubtitleTrack): boolean {
  // Если не signs — считаем полными
  return !isSignsSubtitle(track)
}

/**
 * Выбирает аудиодорожку на основе предпочтений
 */
export function selectAudioTrack(tracks: AudioTrack[], preference: TrackPreference): AudioTrack | null {
  // Только готовые дорожки (с CID в IPFS)
  const readyTracks = tracks.filter((t) => t.transcodedCid)

  if (readyTracks.length === 0) {
    return tracks[0] || null
  }

  switch (preference) {
    case 'RUSSIAN_DUB': {
      // Ищем русскую дорожку
      const russianTrack = readyTracks.find(isRussianTrack)
      return russianTrack || readyTracks[0]
    }

    case 'ORIGINAL_SUB': {
      // Ищем оригинальную дорожку (японская/английская)
      const originalTrack = readyTracks.find(isOriginalTrack)
      return originalTrack || readyTracks[0]
    }

    case 'AUTO':
    default: {
      // Сначала пробуем русскую, потом оригинал
      const russianTrack = readyTracks.find(isRussianTrack)
      if (russianTrack) {
        return russianTrack
      }

      const originalTrack = readyTracks.find(isOriginalTrack)
      return originalTrack || readyTracks[0]
    }
  }
}

/**
 * Выбирает дорожку субтитров на основе предпочтений
 */
export function selectSubtitleTrack(
  tracks: SubtitleTrack[],
  preference: TrackPreference,
  selectedAudioIsRussian: boolean,
): SubtitleTrack | null {
  if (tracks.length === 0) {
    return null
  }

  switch (preference) {
    case 'RUSSIAN_DUB': {
      // Если русская озвучка — ищем субтитры надписей
      if (selectedAudioIsRussian) {
        const signsTrack = tracks.find(isSignsSubtitle)
        return signsTrack || null // Если нет signs — без субтитров
      }
      // Если нет русской озвучки — полные субтитры
      const fullTrack = tracks.find((t) => isRussianTrack(t) && isFullSubtitle(t))
      return fullTrack || tracks.find(isFullSubtitle) || tracks[0]
    }

    case 'ORIGINAL_SUB': {
      // Полные субтитры (русские если есть)
      const russianFullTrack = tracks.find((t) => isRussianTrack(t) && isFullSubtitle(t))
      if (russianFullTrack) {
        return russianFullTrack
      }

      return tracks.find(isFullSubtitle) || tracks[0]
    }

    case 'AUTO':
    default: {
      // Если русская озвучка — signs, иначе полные
      if (selectedAudioIsRussian) {
        const signsTrack = tracks.find(isSignsSubtitle)
        return signsTrack || null
      }

      // Полные субтитры
      const russianFullTrack = tracks.find((t) => isRussianTrack(t) && isFullSubtitle(t))
      return russianFullTrack || tracks.find(isFullSubtitle) || tracks[0]
    }
  }
}

/**
 * Проверяет является ли аудио дорожка русской (для проверки выбора субтитров)
 */
export function checkIsRussianAudio(track: AudioTrack | undefined): boolean {
  if (!track) {
    return false
  }
  return isRussianTrack(track)
}
