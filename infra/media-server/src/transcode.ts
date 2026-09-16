import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { runFfprobe, spawnFfmpeg } from './ffmpeg.ts'

/**
 * Транскодирование исходника в рендишены для `<video>` и постер.
 *
 * Выход всегда 8-битный BT.709 (H.264 High, `yuv420p`), что бы ни пришло на вход:
 * - без `-pix_fmt yuv420p` libx264 сохраняет битность и субдискретизацию исходника — 10-битный
 *   мастер превращается в H.264 High 10, 4:2:2 — в High 4:2:2, и Chromium такое не декодирует
 *   вовсе (`.claude/docs/chromium-video-codec-limits.md`);
 * - HDR (PQ/HLG — обычная запись iPhone) простой сменой формата пикселей даёт блёклую картинку,
 *   поэтому его тонмапим в SDR;
 * - BT.2020 без HDR и BT.601 (SD) пересчитываем в BT.709, чтобы выходные теги не врали.
 *
 * Разбор цепочек и замеры — `.claude/docs/media-server.md`, раздел «Цвет и формат пикселей».
 */

/** Параметры видеопотока исходника, от которых зависит цепочка фильтров */
export interface SourceVideoInfo {
  width: number
  height: number
  durationSec: number | null
  pixFmt: string | null
  colorRange: string | null
  colorSpace: string | null
  colorTransfer: string | null
  colorPrimaries: string | null
}

export interface Rendition {
  /** Ключ в объекте, который отдаёт `videoUrls()` в storage.ts — публичный контракт вебхука video.ready */
  key: '320p' | '720p' | '1080p'
  /** Имя файла на диске */
  file: string
  height: number
  crf: number
  audioBitrate: string
}

export const RENDITIONS: readonly Rendition[] = [
  { key: '320p', file: '320p.mp4', height: 320, crf: 26, audioBitrate: '64k' },
  { key: '720p', file: '720p.mp4', height: 720, crf: 23, audioBitrate: '128k' },
  { key: '1080p', file: '1080p.mp4', height: 1080, crf: 22, audioBitrate: '192k' },
]

export const POSTER_FILE = 'poster.jpg'

/**
 * Тонмаппинг HDR → SDR. Опорный белый HDR — 203 нит (BT.2408), он же белый SDR: в линейном
 * свете это 1.0. `mobius` с коленом 0.7 оставляет всё до 70% линейной яркости как есть и плавно
 * сжимает более яркое к пику. Популярный `hable` на тех же цветах темнее на 30–60 единиц из 255
 * (сравнение вариантов — в доке).
 */
const TONEMAP_NPL = 203
const TONEMAP_FILTER = 'tonemap=tonemap=mobius:param=0.7:desat=0'

type ColorTargetName = 'video' | 'jpeg'

interface ColorTarget {
  /** Матрица для swscale (`scale=out_color_matrix`) */
  swsMatrix: string
  /** Та же матрица в терминах zscale */
  zMatrix: string
  range: 'tv' | 'pc'
  pixFmt: string
  /**
   * Итоговые цветовые свойства кадра. ffmpeg 7+ пишет в поток свойства кадра поверх
   * `-color_primaries`/`-color_trc`: swscale меняет только матрицу и диапазон, и без этого
   * фильтра SD-исходник уезжал с тегами `smpte170m` (поймано тестом на ffmpeg 8).
   */
  setparams: string
}

const TARGETS: Record<ColorTargetName, ColorTarget> = {
  // H.264 для <video>: BT.709, ограниченный диапазон — то, что ждёт любой браузер
  video: {
    swsMatrix: 'bt709',
    zMatrix: 'bt709',
    range: 'tv',
    pixFmt: 'yuv420p',
    setparams: 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
  },
  // JPEG (JFIF) браузер декодирует по BT.601 в полном диапазоне, независимо от исходника
  jpeg: {
    swsMatrix: 'bt601',
    zMatrix: 'bt470bg',
    range: 'pc',
    pixFmt: 'yuvj420p',
    setparams: 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt470bg:range=pc',
  },
}

// Передаточные функции HDR: PQ (HDR10, Dolby Vision) и HLG (iPhone, камеры, ТВ)
const HDR_TRANSFERS = new Set(['smpte2084', 'arib-std-b67'])

// Значения, которые ffprobe пишет теми же словами, что понимает zscale. Всё, что не из списка,
// в строку фильтра не попадает: файл загружает пользователь, метаданные — его текст.
const ZSCALE_TRANSFERS = new Set([
  'bt709',
  'smpte170m',
  'bt470m',
  'bt470bg',
  'smpte240m',
  'linear',
  'bt2020-10',
  'bt2020-12',
  'smpte2084',
  'arib-std-b67',
  'iec61966-2-1',
])
const ZSCALE_PRIMARIES = new Set(['bt709', 'bt470m', 'bt470bg', 'smpte170m', 'smpte240m', 'film', 'bt2020'])
const ZSCALE_MATRICES = new Set(['bt709', 'fcc', 'bt470bg', 'smpte170m', 'smpte240m', 'bt2020nc', 'bt2020c'])

// ffprobe color_space → имя матрицы swscale
const SWS_MATRICES: Record<string, string> = {
  bt709: 'bt709',
  smpte170m: 'smpte170m',
  bt470bg: 'bt470',
  fcc: 'fcc',
  smpte240m: 'smpte240m',
}

const UNKNOWN_VALUES = new Set(['', 'unknown', 'unspecified', 'reserved'])

function knownOrNull(value: unknown): string | null {
  return typeof value === 'string' && !UNKNOWN_VALUES.has(value) ? value : null
}

interface FfprobeOutput {
  streams?: Array<Record<string, unknown>>
  format?: { duration?: string }
}

/** Разбирает вывод ffprobe в `SourceVideoInfo`; `null` — если видеопотока нет */
export function parseProbe(raw: unknown): SourceVideoInfo | null {
  const data = raw as FfprobeOutput
  const stream = data.streams?.[0]
  if (!stream) { return null }
  const duration = Number(data.format?.duration)
  return {
    width: Number(stream.width) || 0,
    height: Number(stream.height) || 0,
    durationSec: Number.isFinite(duration) && duration > 0 ? duration : null,
    pixFmt: knownOrNull(stream.pix_fmt),
    colorRange: knownOrNull(stream.color_range),
    colorSpace: knownOrNull(stream.color_space),
    colorTransfer: knownOrNull(stream.color_transfer),
    colorPrimaries: knownOrNull(stream.color_primaries),
  }
}

export async function probeSource(sourcePath: string): Promise<SourceVideoInfo> {
  const raw = await runFfprobe([
    // `V` — видеопотоки без обложек; тот же спецификатор стоит в `-map` ниже
    '-select_streams',
    'V:0',
    '-show_entries',
    'stream=width,height,pix_fmt,color_range,color_space,color_transfer,color_primaries:format=duration',
    sourcePath,
  ])
  const info = parseProbe(raw)
  if (!info) { throw new Error(`no video stream in ${sourcePath}`) }
  return info
}

export function isHdr(info: SourceVideoInfo): boolean {
  return info.colorTransfer !== null && HDR_TRANSFERS.has(info.colorTransfer)
}

/** BT.2020 без HDR: цвета нужно пересчитать в BT.709, тонмаппинг не нужен */
export function isWideGamut(info: SourceVideoInfo): boolean {
  return info.colorPrimaries === 'bt2020' || info.colorSpace === 'bt2020nc' || info.colorSpace === 'bt2020c'
}

function isFullRange(info: SourceVideoInfo): boolean {
  if (info.colorRange) { return info.colorRange === 'pc' }
  return info.pixFmt?.startsWith('yuvj') ?? false
}

/**
 * Матрица исходника для swscale. Без тега — догадка по разрешению, как у mpv:
 * SD считается BT.601, всё остальное — BT.709.
 */
function sourceSwsMatrix(info: SourceVideoInfo): string {
  const known = info.colorSpace ? SWS_MATRICES[info.colorSpace] : undefined
  if (known) { return known }
  return info.width >= 1280 || info.height > 576 ? 'bt709' : 'bt601'
}

/** Входные параметры zscale: явно, чтобы не зависеть от того, донёс ли декодер теги до кадра */
function zscaleInput(info: SourceVideoInfo): string {
  const parts: string[] = []
  if (info.colorTransfer && ZSCALE_TRANSFERS.has(info.colorTransfer)) { parts.push(`tin=${info.colorTransfer}`) }
  const primaries = info.colorPrimaries && ZSCALE_PRIMARIES.has(info.colorPrimaries) ? info.colorPrimaries : 'bt2020'
  parts.push(`pin=${primaries}`)
  // Для RGB-исходника матрица не нужна — zscale возьмёт её из кадра
  if (!info.pixFmt?.startsWith('gbr') && !info.pixFmt?.startsWith('rgb')) {
    const matrix = info.colorSpace && ZSCALE_MATRICES.has(info.colorSpace) ? info.colorSpace : 'bt2020nc'
    parts.push(`min=${matrix}`)
  }
  parts.push(`rin=${isFullRange(info) ? 'pc' : 'tv'}`)
  return parts.join(':')
}

/**
 * Строка `-vf`: масштаб (если задан) и приведение цвета к цели.
 * Три ветки: HDR → тонмаппинг, BT.2020 SDR → пересчёт гаммы цветов, прочее → swscale.
 */
export function buildVideoFilter(info: SourceVideoInfo, targetName: ColorTargetName, height?: number): string {
  const target = TARGETS[targetName]
  const resize = height ? `scale=-2:${height}` : null

  if (isHdr(info)) {
    return [
      resize,
      `zscale=${zscaleInput(info)}:t=linear:npl=${TONEMAP_NPL}`,
      'format=gbrpf32le',
      'zscale=p=bt709',
      TONEMAP_FILTER,
      `zscale=t=bt709:m=${target.zMatrix}:r=${target.range}`,
      `format=${target.pixFmt}`,
      target.setparams,
    ].filter(Boolean).join(',')
  }

  if (isWideGamut(info)) {
    return [
      resize,
      `zscale=${zscaleInput(info)}:t=bt709:p=bt709:m=${target.zMatrix}:r=${target.range}`,
      `format=${target.pixFmt}`,
      target.setparams,
    ].filter(Boolean).join(',')
  }

  const sws = [
    `in_color_matrix=${sourceSwsMatrix(info)}`,
    `out_color_matrix=${target.swsMatrix}`,
    `in_range=${isFullRange(info) ? 'pc' : 'tv'}`,
    `out_range=${target.range}`,
  ].join(':')
  return `scale=${height ? `-2:${height}:` : ''}${sws},format=${target.pixFmt},${target.setparams}`
}

/** Общие аргументы кодирования — одни на все рендишены, чтобы вызовы не расходились */
export function renditionArgs(
  sourcePath: string,
  info: SourceVideoInfo,
  rendition: Rendition,
  outPath: string,
): string[] {
  return [
    '-i',
    sourcePath,
    '-map',
    '0:V:0',
    '-map',
    '0:a:0?',
    '-vf',
    buildVideoFilter(info, 'video', rendition.height),
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'medium',
    '-crf',
    String(rendition.crf),
    '-colorspace',
    'bt709',
    '-color_primaries',
    'bt709',
    '-color_trc',
    'bt709',
    '-color_range',
    'tv',
    '-c:a',
    'aac',
    '-b:a',
    rendition.audioBitrate,
    '-movflags',
    '+faststart',
    '-y',
    outPath,
  ]
}

/** Кадр для постера: 1-я секунда, но не дальше середины короткого ролика */
export function posterSeekSec(durationSec: number | null): number {
  return durationSec === null ? 1 : Math.min(1, durationSec / 2)
}

export function posterArgs(sourcePath: string, info: SourceVideoInfo, seekSec: number, outPath: string): string[] {
  return [
    '-ss',
    String(seekSec),
    '-i',
    sourcePath,
    '-map',
    '0:V:0',
    '-frames:v',
    '1',
    '-vf',
    buildVideoFilter(info, 'jpeg'),
    '-q:v',
    '3',
    '-update',
    '1',
    '-y',
    outPath,
  ]
}

async function fileExists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false)
}

/** Кодирует все рендишены и постер в `outDir` */
export async function transcodeToDir(sourcePath: string, outDir: string): Promise<SourceVideoInfo> {
  const info = await probeSource(sourcePath)
  if (isHdr(info)) {
    console.log(`[transcode] HDR (${info.colorTransfer}/${info.colorPrimaries}) → тонмаппинг в BT.709`)
  }

  for (const rendition of RENDITIONS) {
    await spawnFfmpeg(renditionArgs(sourcePath, info, rendition, join(outDir, rendition.file)))
  }

  // ffmpeg завершается с кодом 0, даже если на позиции seek кадра не нашлось (длительность
  // неизвестна, а ролик короче секунды) — тогда повторяем с начала
  const posterPath = join(outDir, POSTER_FILE)
  await spawnFfmpeg(posterArgs(sourcePath, info, posterSeekSec(info.durationSec), posterPath))
  if (!(await fileExists(posterPath))) {
    await spawnFfmpeg(posterArgs(sourcePath, info, 0, posterPath))
  }

  return info
}
