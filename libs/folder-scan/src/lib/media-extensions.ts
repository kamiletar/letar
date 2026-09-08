/**
 * Расширения медиафайлов — единственный источник истины.
 *
 * Модуль намеренно **не импортирует ничего** из `node:*`/`electron`: его должны уметь
 * подключать и main-процесс, и renderer (Next.js-бандл), которые собираются разными
 * бандлерами. Поэтому у него отдельная точка входа `@letar/folder-scan/media-extensions` —
 * барель `@letar/folder-scan` тянет за собой `node:fs` и `electron` и в renderer не годится.
 *
 * До появления этого модуля наборы расширений были переписаны руками в восьми местах и уже
 * разъехались: где-то с точкой, где-то без; `.ts`/`.m2ts` то были, то нет; `.sub` числился в
 * одном списке субтитров и отсутствовал в другом.
 */

/** Расширения видеофайлов (с точкой, нижний регистр) */
export const VIDEO_EXTENSIONS: ReadonlySet<string> = new Set([
  '.mkv',
  '.mp4',
  '.avi',
  '.webm',
  '.mov',
  '.wmv',
  '.flv',
  '.m4v',
])

/**
 * Транспортные потоки (эфирная запись, Blu-ray) — держатся отдельно от `VIDEO_EXTENSIONS`
 * намеренно.
 *
 * `.ts` — это ещё и расширение исходников TypeScript. Рекурсивный обход папок
 * (`scanFolderForMedia`) их поэтому не берёт: иначе сканирование каталога с кодом выдало бы
 * сотни «видеофайлов». Включать этот набор можно там, где путь пришёл напрямую от
 * пользователя — диалог выбора файла, drag&drop, файловая ассоциация.
 */
export const TRANSPORT_STREAM_EXTENSIONS: ReadonlySet<string> = new Set(['.ts', '.m2ts'])

/** Видео, которое плеер согласен открыть по прямому указанию пользователя */
export const PLAYABLE_VIDEO_EXTENSIONS: ReadonlySet<string> = new Set([
  ...VIDEO_EXTENSIONS,
  ...TRANSPORT_STREAM_EXTENSIONS,
])

/** Расширения аудиофайлов (с точкой, нижний регистр) */
export const AUDIO_EXTENSIONS: ReadonlySet<string> = new Set([
  '.mka',
  '.m4a',
  '.flac',
  '.opus',
  '.mp3',
  '.aac',
  '.wav',
  '.ogg',
  '.ac3',
  '.dts',
])

/** Текстовые субтитры — те, что сканер умеет разобрать и показать (с точкой, нижний регистр) */
export const SUBTITLE_EXTENSIONS: ReadonlySet<string> = new Set(['.ass', '.ssa', '.srt', '.vtt'])

/**
 * Растровые субтитры (VobSub — `.sub` рядом с `.idx`). Отдельно от `SUBTITLE_EXTENSIONS`
 * по той же причине, что и транспортные потоки: разобрать как текст их нельзя, поэтому
 * сканер их не подбирает. Учитывать там, где файл выбрал сам пользователь.
 */
export const BITMAP_SUBTITLE_EXTENSIONS: ReadonlySet<string> = new Set(['.sub'])

/** Субтитры, которые можно принять от пользователя напрямую (текстовые + растровые) */
export const SELECTABLE_SUBTITLE_EXTENSIONS: ReadonlySet<string> = new Set([
  ...SUBTITLE_EXTENSIONS,
  ...BITMAP_SUBTITLE_EXTENSIONS,
])

/** Расширения файлов шрифтов (с точкой, нижний регистр) */
export const FONT_EXTENSIONS: ReadonlySet<string> = new Set(['.ttf', '.otf', '.woff', '.woff2', '.eot'])

/** Расширение пути в нижнем регистре, вместе с точкой (`'.mkv'`); пустая строка, если его нет */
export function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.')
  const lastSep = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'))
  if (lastDot <= lastSep) {
    return ''
  }
  return filePath.slice(lastDot).toLowerCase()
}

/** Входит ли расширение пути в набор */
export function hasExtension(filePath: string, extensions: ReadonlySet<string>): boolean {
  return extensions.has(getExtension(filePath))
}

/**
 * Тот же набор без ведущей точки — в таком виде расширения ждут `dialog.showOpenDialog`
 * и `fileAssociations` в `electron-builder.yml`.
 */
export function withoutDots(extensions: ReadonlySet<string>): string[] {
  return [...extensions].map((ext) => ext.slice(1))
}
