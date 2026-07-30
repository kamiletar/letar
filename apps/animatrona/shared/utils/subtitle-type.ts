/**
 * Классификатор типа дорожки субтитров — «полные / надписи / песни»
 *
 * Единая точка для ВСЕХ источников субтитров:
 * - внешние файлы (`external-subtitle-scanner.ts`) — имя файла и имя папки;
 * - встроенные дорожки контейнера (`main/ffmpeg/probe.ts`) — `title` из `stream_tags`
 *   и `disposition` из ffprobe.
 *
 * До этого классификация жила только в сканере внешних файлов, поэтому «надписи» в
 * отдельном .ass распознавались, а точно такая же дорожка внутри MKV — нет.
 *
 * Модуль намеренно без Node-зависимостей (`path` не импортируется) — он используется и в
 * main-процессе, и в renderer. При выносе папочного сканера в `libs/folder-scan` переезжает
 * туда целиком.
 */

/** Тип дорожки субтитров */
export type SubtitleType = 'full' | 'signs' | 'songs'

/** Паттерны «надписи» (case-insensitive, подстрока) */
const SIGNS_PATTERNS = ['надписи', 'надпис', 'signs', 'forced']

/** Паттерны «песни/караоке» (case-insensitive, подстрока) */
const SONGS_PATTERNS = ['песни', 'songs', 'karaoke', 'караоке']

/**
 * `disposition` потока из ffprobe.
 *
 * ffprobe отдаёт флаги числами (0/1), поэтому принимаем и число, и boolean —
 * так тип годится и для сырого JSON ffprobe, и для уже нормализованных данных.
 */
export interface StreamDisposition {
  forced?: number | boolean
  default?: number | boolean
}

/** Входные данные классификатора — любое подмножество, всё опционально */
export interface SubtitleTypeSource {
  /** Путь или имя файла внешних субтитров (`.../надписи/ep01.signs.ass`) */
  filePath?: string | null
  /** Название дорожки из контейнера (`stream_tags.title`), например «Signs & Songs» */
  title?: string | null
  /** `disposition` потока из ffprobe */
  disposition?: StreamDisposition | null
}

/** Нормализует флаг disposition (ffprobe отдаёт 0/1) в boolean */
export function isDispositionFlagSet(flag: number | boolean | undefined): boolean {
  return flag === 1 || flag === true
}

/** Проверяет строку по списку паттернов */
function matchesAny(value: string, patterns: string[]): boolean {
  return patterns.some((pattern) => value.includes(pattern))
}

/**
 * Определить тип субтитров по названию дорожки, имени файла и `disposition`.
 *
 * Порядок проверок — от самого надёжного признака к самому косвенному:
 * 1. `title` дорожки — как её назвал сам фансабер («Надписи», «Signs & Songs»);
 * 2. суффикс имени файла (`ep01.надписи.ass`);
 * 3. любая часть пути, включая имя папки (`RUS Subs/надписи/`);
 * 4. `disposition.forced` — но **только когда названий не было вообще** (ни `title`, ни
 *    `filePath`), то есть выбирать больше не из чего.
 *
 * ⚠️ Про пункт 4. forced и «надписи» — формально разные вещи: forced означает «показывать
 * даже при выключенных субтитрах». В аниме-рипах forced-дорожка обычно и правда содержит
 * надписи, но встречается и обратное — полные субтитры помечают forced, чтобы плеер включал
 * их сам. Поэтому если дорожка **названа** («Русские», «Полные»), а слов про надписи/песни в
 * названии нет — она считается полной, и forced этого не переопределяет. Информация при этом
 * не теряется: флаг живёт отдельным полем `isForced` у дорожки, и режим «Озвучка» может
 * оставлять forced-дорожки видимыми независимо от их `kind`.
 */
export function detectSubtitleType(source: SubtitleTypeSource): SubtitleType {
  // 1. Название дорожки
  const title = source.title?.toLowerCase().trim()
  const hasName = !!title || !!source.filePath

  if (title) {
    if (matchesAny(title, SIGNS_PATTERNS)) {
      return 'signs'
    }
    if (matchesAny(title, SONGS_PATTERNS)) {
      return 'songs'
    }
  }

  if (source.filePath) {
    const normalized = source.filePath.replace(/\\/g, '/').toLowerCase()
    const parts = normalized.split('/')
    const fileName = parts[parts.length - 1] ?? ''

    // 2. Суффикс имени файла: убираем расширение, смотрим последнюю часть через точку
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, '')
    const nameParts = nameWithoutExt.split('.')
    const lastPart = nameParts[nameParts.length - 1]

    if (lastPart) {
      if (matchesAny(lastPart, SIGNS_PATTERNS)) {
        return 'signs'
      }
      if (matchesAny(lastPart, SONGS_PATTERNS)) {
        return 'songs'
      }
    }

    // 3. Любая часть пути (имя папки)
    for (const part of parts) {
      if (matchesAny(part, SIGNS_PATTERNS)) {
        return 'signs'
      }
      if (matchesAny(part, SONGS_PATTERNS)) {
        return 'songs'
      }
    }
  }

  // 4. Косвенный признак — forced-флаг контейнера. Работает только для безымянных дорожек:
  // у названной дорожки название уже проверено выше и оно решает.
  if (!hasName && isDispositionFlagSet(source.disposition?.forced)) {
    return 'signs'
  }

  return 'full'
}

/**
 * Дорожка несёт только надписи или песни — такую нельзя гасить в режиме «Озвучка»:
 * вместе с ней с экрана пропадут переводы вывесок, записок и текстов песен.
 */
export function isPartialSubtitleType(type: SubtitleType): boolean {
  return type === 'signs' || type === 'songs'
}
