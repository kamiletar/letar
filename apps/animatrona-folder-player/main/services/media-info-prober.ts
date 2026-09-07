/**
 * `MediaProber` для animatrona-folder-player — `mediainfo.js` (MediaInfoLib, скомпилированный в WASM),
 * без зависимости от ffmpeg-бинаря. Аналог `ffprobeProber` из Animatrona (`main/ffmpeg/probe.ts`),
 * обе реализации обязаны отдавать одну и ту же нормализованную `MediaInfo` (см. JSDoc интерфейса
 * в `@letar/folder-scan`).
 */
import { detectSubtitleType, isDispositionFlagSet } from '@letar/folder-scan'
import type { AudioTrack, MediaInfo, MediaProber, SubtitleTrack, VideoTrack } from '@letar/folder-scan'
import mediaInfoFactory from 'mediainfo.js'
import type { MediaInfo as MediaInfoInstance, MediaInfoResult, ReadChunkFunc, Track } from 'mediainfo.js'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'

/**
 * webpack подставляет это как алиас нативного Node `require`, не анализируя и не бандлируя
 * вызов — обычный `require.resolve` со строкой-шаблоном webpack пытается разрешить статически
 * (частичная вычислимость выражения) ещё на этапе сборки и падает, потому что
 * `mediainfo.js/${wasmPath}` не соответствует ни одному пути из `exports` пакета без
 * реального значения `wasmPath`, известного только в рантайме.
 */
declare const __non_webpack_require__: NodeJS.Require

/** `Default`/`Forced` в mediainfo.js — строка 'Yes'/'No', а не boolean */
function yesNo(value: string | undefined): boolean {
  return isDispositionFlagSet(value === 'Yes')
}

function parseNumber(value: string | number | undefined): number | undefined {
  if (value === undefined) {
    return undefined
  }
  const num = typeof value === 'number' ? value : Number.parseFloat(value)
  return Number.isFinite(num) ? num : undefined
}

/**
 * Порядковый номер потока внутри контейнера (`StreamOrder`, "порядок потока в файле для этого
 * типа потока, счёт с 0") — ближайший аналог ffprobe stream index, но НЕ гарантированно то же
 * самое число: ffprobe нумерует потоки сквозным индексом по всем типам сразу, mediainfo.js —
 * по каждому типу отдельно. Открытый риск, зафиксирован в плане (§3, §11) — тест
 * FfprobeProber vs MediaInfoWasmProber на одинаковом файле ещё не написан.
 */
function trackIndex(track: Track, fallback: number): number {
  return parseNumber((track as { StreamOrder?: string }).StreamOrder) ?? fallback
}

async function probeFile(filePath: string): Promise<MediaInfo> {
  const fileHandle = await fsPromises.open(filePath, 'r')
  let mediainfo: MediaInfoInstance | undefined

  try {
    const fileStat = await fileHandle.stat()
    const fileSize = fileStat.size

    const readChunk: ReadChunkFunc = async (size, offset) => {
      const buffer = new Uint8Array(size)
      await fileHandle.read(buffer, 0, size, offset)
      return buffer
    }

    mediainfo = await mediaInfoFactory({
      format: 'object',
      locateFile: (wasmPath) => __non_webpack_require__.resolve(`mediainfo.js/${wasmPath}`),
    })

    const result = (await mediainfo.analyzeData(() => fileSize, readChunk)) as MediaInfoResult
    const tracks = result.media?.track ?? []

    const generalTrack = tracks.find((t) => t['@type'] === 'General')
    const audioTracks = tracks.filter((t) => t['@type'] === 'Audio')
    const textTracks = tracks.filter((t) => t['@type'] === 'Text')
    const videoTracks = tracks.filter((t) => t['@type'] === 'Video')

    const duration = parseNumber((generalTrack as { Duration?: number })?.Duration) ?? 0
    const size = parseNumber((generalTrack as { FileSize?: string })?.FileSize) ?? fileSize
    const format = generalTrack?.Format ?? path.extname(filePath).replace(/^\./, '')

    const mappedAudioTracks: AudioTrack[] = audioTracks.map((track, i) => {
      const t = track as {
        Language?: string
        Title?: string
        Format?: string
        BitRate?: number
        Channels?: number
        Default?: string
        Forced?: string
      }
      return {
        input: filePath,
        index: trackIndex(track, i),
        language: t.Language ?? 'und',
        title: t.Title ?? '',
        codec: t.Format,
        bitrate: parseNumber(t.BitRate),
        channels: parseNumber(t.Channels),
        isDefault: yesNo(t.Default),
        isForced: yesNo(t.Forced),
      }
    })

    const mappedSubtitleTracks: SubtitleTrack[] = textTracks.map((track, i) => {
      const t = track as {
        Language?: string
        Title?: string
        Format?: string
        Default?: string
        Forced?: string
      }
      const isDefault = yesNo(t.Default)
      const isForced = yesNo(t.Forced)
      return {
        // Встроенные субтитры не извлекаются на этапе пробы — путь указывает на исходное видео,
        // тот же приём, что и в ffprobeProber (apps/animatrona/main/ffmpeg/probe.ts)
        path: filePath,
        index: trackIndex(track, i),
        codec: t.Format ?? 'unknown',
        language: t.Language ?? 'und',
        title: t.Title ?? '',
        fonts: [],
        isDefault,
        isForced,
        subtitleType: detectSubtitleType({
          title: t.Title,
          filePath,
          disposition: { default: isDefault, forced: isForced },
        }),
      }
    })

    const mappedVideoTracks: VideoTrack[] = videoTracks.map((track) => {
      const t = track as {
        Duration?: number
        Width?: number
        Height?: number
        Format?: string
        BitRate?: number
        FrameRate?: number
        ColorSpace?: string
        BitDepth?: number
        ScanType?: string
        Format_Profile?: string
      }
      return {
        path: filePath,
        duration: parseNumber(t.Duration) ?? duration,
        width: parseNumber(t.Width),
        height: parseNumber(t.Height),
        codec: t.Format,
        bitrate: parseNumber(t.BitRate),
        fps: parseNumber(t.FrameRate),
        bitDepth: parseNumber(t.BitDepth),
        fieldOrder: t.ScanType,
        colorSpace: t.ColorSpace,
        profile: t.Format_Profile,
      }
    })

    return {
      path: filePath,
      duration,
      size,
      format,
      videoTracks: mappedVideoTracks,
      audioTracks: mappedAudioTracks,
      subtitleTracks: mappedSubtitleTracks,
      // Главы (Menu-трек MediaInfoLib) не отдаются этой JS-обвязкой как структурированное поле —
      // только внутренние позиции Chapters_Pos_Begin/End, ссылающиеся на необёрнутый Get()-API.
      // Реальные метки времени лежат в динамических timecode-ключах `extra`-словаря Menu-трека,
      // но точный формат ключей не проверен на реальном файле (в репозитории нет MKV/MP4
      // фикстур с главами) — оставлено undefined, а не угадано, чтобы не подсунуть плееру
      // неверные границы. Нужны реальные тестовые файлы, см. план §7/§11.
      chapters: undefined,
      // MediaInfoLib не отдаёт вложения MKV (шрифты) через этот биндинг отдельным списком —
      // в отличие от ffprobe (-show_streams видит attachment-потоки). Оставлено undefined.
      attachmentFonts: undefined,
    }
  } finally {
    mediainfo?.close()
    await fileHandle.close()
  }
}

export const mediaInfoWasmProber: MediaProber = { probe: probeFile }
