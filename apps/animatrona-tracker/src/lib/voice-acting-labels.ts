/**
 * Человекочитаемые лейблы кодов озвучки/субтитров для UI.
 *
 * Отдельный модуль (без серверных импортов) — можно импортировать из client
 * компонентов без протечки prisma/redis в браузерный бандл.
 */

/** Языки, для которых мы отслеживаем наличие дорожек */
export type TrackedLanguage = 'RU' | 'EN' | 'JA'

/** Метаданные о коде озвучки для UI */
export interface VoiceActingMeta {
  code: string
  label: string
  type: 'dub' | 'sub'
  language: TrackedLanguage
}

/** Человекочитаемые лейблы для фильтров в UI */
export const VOICE_ACTING_LABELS: VoiceActingMeta[] = [
  { code: 'DUB_RU', label: 'Русская озвучка', type: 'dub', language: 'RU' },
  { code: 'DUB_EN', label: 'Английская озвучка', type: 'dub', language: 'EN' },
  { code: 'DUB_JA', label: 'Японская (оригинал)', type: 'dub', language: 'JA' },
  { code: 'SUB_RU', label: 'Русские субтитры', type: 'sub', language: 'RU' },
  { code: 'SUB_EN', label: 'Английские субтитры', type: 'sub', language: 'EN' },
]
