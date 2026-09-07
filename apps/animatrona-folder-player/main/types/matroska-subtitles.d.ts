/**
 * `matroska-subtitles` не поставляет собственные типы (нет `.d.ts` в пакете, нет
 * `@types/matroska-subtitles` в npm) — минимальная амбиентная декларация по факту использования,
 * сверена с исходником `dist/matroska-subtitles.js` (0.3.7 → фактически 3.3.2, см.
 * `package.json` приложения).
 */
declare module 'matroska-subtitles' {
  import type { Transform } from 'node:stream'

  /** Элемент события `tracks` — метаданные одной субтитровой дорожки контейнера */
  export interface SubtitleTrackInfo {
    /** Номер дорожки в Matroska-контейнере (не ffprobe/mediainfo stream index) */
    number: number
    /** Код языка (может быть `undefined`, если контейнер его не указал) */
    language?: string
    /** Тип по `CodecID`: `S_TEXT/UTF8` → `utf8` (аналог SRT), `S_TEXT/ASS`/`S_TEXT/SSA` */
    type: 'utf8' | 'ass' | 'ssa'
    /** Нестандартный тег `Name` — иногда несёт язык/описание дорожки */
    name?: string
    /** Только для `ass`/`ssa` — `CodecPrivate`, т.е. `[Script Info]` + `[V4+ Styles]` целиком */
    header?: string
  }

  /** Одна субтитровая реплика из события `subtitle` */
  export interface SubtitleCue {
    /** Для `ass`/`ssa` — уже без служебных ASS-полей (см. ниже), для `utf8` — весь текст реплики */
    text: string
    /** Начало в миллисекундах от начала файла */
    time: number
    /** Длительность в миллисекундах */
    duration: number
    /** Поля ниже присутствуют только для `type: 'ass'|'ssa'` (распарсенная ASS Dialogue-строка) */
    layer?: string
    style?: string
    name?: string
    marginL?: string
    marginR?: string
    marginV?: string
    effect?: string
  }

  /** Вложение из контейнера (`file`) — извлечение шрифтов без ffmpeg */
  export interface SubtitleAttachment {
    filename: string
    mimetype: string
    data: Uint8Array
  }

  /** Основной класс — Writable/Transform-стрим, скармливается через `.pipe()` */
  export class SubtitleParser extends Transform {
    on(event: 'tracks', listener: (tracks: SubtitleTrackInfo[]) => void): this
    on(event: 'subtitle', listener: (subtitle: SubtitleCue, trackNumber: number) => void): this
    on(event: 'file', listener: (file: SubtitleAttachment) => void): this
    on(event: 'finish', listener: () => void): this
    on(event: 'error', listener: (error: Error) => void): this
    once(event: 'tracks', listener: (tracks: SubtitleTrackInfo[]) => void): this
  }

  /** Класс для seek-сценариев (случайный доступ) — в этой задаче не используется */
  export class SubtitleStream extends Transform {
    constructor(prevInstance?: SubtitleParser | SubtitleStream)
  }
}
