/**
 * Регрессия транскода: выход всегда H.264 High / yuv420p / BT.709, HDR не выцветает.
 *
 * Интеграционная часть кодирует короткие однотонные клипы настоящим ffmpeg и сравнивает
 * центральный пиксель с исходным цветом. Прогон на том же ffmpeg, что в проде:
 *
 *     docker build --target test infra/media-server
 *
 * Локально (`bun test` в infra/media-server) работает с любым ffmpeg, где есть zscale и
 * tonemap; AV1-кейс пропускается, если нет ни одного AV1-энкодера.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  buildVideoFilter,
  isHdr,
  parseProbe,
  POSTER_FILE,
  posterArgs,
  posterSeekSec,
  renditionArgs,
  RENDITIONS,
  type SourceVideoInfo,
  transcodeToDir,
} from '../src/transcode.ts'

const SDR_709: SourceVideoInfo = {
  width: 1920,
  height: 1080,
  durationSec: 10,
  pixFmt: 'yuv420p',
  colorRange: 'tv',
  colorSpace: 'bt709',
  colorTransfer: 'bt709',
  colorPrimaries: 'bt709',
}

const HLG: SourceVideoInfo = {
  ...SDR_709,
  pixFmt: 'yuv420p10le',
  colorSpace: 'bt2020nc',
  colorTransfer: 'arib-std-b67',
  colorPrimaries: 'bt2020',
}

describe('parseProbe', () => {
  test('нормализует unknown/unspecified в null', () => {
    const info = parseProbe({
      streams: [{ width: 640, height: 480, pix_fmt: 'yuv420p', color_range: 'unknown', color_space: 'unspecified' }],
      format: { duration: '1.500000' },
    })
    expect(info).toEqual({
      width: 640,
      height: 480,
      durationSec: 1.5,
      pixFmt: 'yuv420p',
      colorRange: null,
      colorSpace: null,
      colorTransfer: null,
      colorPrimaries: null,
    })
  })

  test('без видеопотока — null', () => {
    expect(parseProbe({ streams: [] })).toBeNull()
  })

  test('нечисловая длительность — null', () => {
    expect(parseProbe({ streams: [{ width: 1, height: 1 }], format: { duration: 'N/A' } })?.durationSec).toBeNull()
  })
})

describe('buildVideoFilter', () => {
  test('SDR BT.709 — один swscale с явными матрицей и диапазоном', () => {
    expect(buildVideoFilter(SDR_709, 'video', 720)).toBe(
      'scale=-2:720:in_color_matrix=bt709:out_color_matrix=bt709:in_range=tv:out_range=tv,format=yuv420p,'
        + 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
    )
  })

  test('SD без тега матрицы считается BT.601', () => {
    const sd = { ...SDR_709, width: 720, height: 576, colorSpace: null }
    expect(buildVideoFilter(sd, 'video', 720)).toContain('in_color_matrix=bt601:out_color_matrix=bt709')
  })

  test('yuvj без тега диапазона считается полным диапазоном', () => {
    const full = { ...SDR_709, pixFmt: 'yuvj420p', colorRange: null }
    expect(buildVideoFilter(full, 'video', 720)).toContain('in_range=pc:out_range=tv')
  })

  test('HLG — тонмаппинг с явными входными параметрами', () => {
    expect(isHdr(HLG)).toBe(true)
    expect(buildVideoFilter(HLG, 'video', 1080)).toBe(
      'scale=-2:1080,'
        + 'zscale=tin=arib-std-b67:pin=bt2020:min=bt2020nc:rin=tv:t=linear:npl=203,'
        + 'format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=mobius:param=0.7:desat=0,'
        + 'zscale=t=bt709:m=bt709:r=tv,format=yuv420p,'
        + 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
    )
  })

  test('BT.2020 SDR — пересчёт в BT.709 без тонмаппинга', () => {
    const wide = { ...HLG, colorTransfer: 'bt2020-10' }
    const filter = buildVideoFilter(wide, 'video', 720)
    expect(filter).not.toContain('tonemap')
    expect(filter).toContain('zscale=tin=bt2020-10:pin=bt2020:min=bt2020nc:rin=tv:t=bt709:p=bt709:m=bt709:r=tv')
  })

  test('постер — BT.601 полный диапазон (так браузер декодирует JPEG)', () => {
    expect(buildVideoFilter(SDR_709, 'jpeg')).toBe(
      'scale=in_color_matrix=bt709:out_color_matrix=bt601:in_range=tv:out_range=pc,format=yuvj420p,'
        + 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt470bg:range=pc',
    )
    expect(buildVideoFilter(HLG, 'jpeg')).toContain('zscale=t=bt709:m=bt470bg:r=pc,format=yuvj420p,')
  })

  test('посторонние значения метаданных не попадают в строку фильтра', () => {
    const hostile = { ...HLG, colorPrimaries: 'bt2020:x=1,drawtext', colorSpace: 'a,b' }
    const filter = buildVideoFilter(hostile, 'video', 720)
    expect(filter).not.toContain('drawtext')
    expect(filter).not.toContain('a,b')
  })
})

describe('аргументы ffmpeg', () => {
  test.each(RENDITIONS.map((r) => [r.file, r] as const))('%s — 8 бит, High, теги BT.709', (_, rendition) => {
    const args = renditionArgs('/in.mov', HLG, rendition, '/out.mp4').join(' ')
    expect(args).toContain('-c:v libx264 -profile:v high -pix_fmt yuv420p')
    expect(args).toContain('-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv')
    expect(args).toContain(`scale=-2:${rendition.height},`)
  })

  test('постер не ищет кадр за концом короткого ролика', () => {
    expect(posterSeekSec(null)).toBe(1)
    expect(posterSeekSec(30)).toBe(1)
    expect(posterSeekSec(0.5)).toBe(0.25)
    expect(posterArgs('/in.mov', SDR_709, 0.25, '/p.jpg').slice(0, 2)).toEqual(['-ss', '0.25'])
  })
})

// ─── Интеграция с настоящим ffmpeg ───────────────────────────────────────────

const ffmpegAvailable = Bun.spawnSync(['ffmpeg', '-version']).exitCode === 0

function ffmpegList(kind: 'filters' | 'encoders'): string {
  return Bun.spawnSync(['ffmpeg', '-hide_banner', `-${kind}`]).stdout.toString()
}

function has(list: string, name: string): boolean {
  return new RegExp(`\\s${name}\\s`).test(list)
}

function run(args: string[]): void {
  const res = Bun.spawnSync(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', ...args])
  if (res.exitCode !== 0) { throw new Error(`ffmpeg ${args.join(' ')}\n${res.stderr.toString()}`) }
}

function probeStream(path: string): Record<string, string> {
  const res = Bun.spawnSync([
    'ffprobe',
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=codec_name,profile,pix_fmt,color_range,color_space,color_transfer,color_primaries',
    '-of',
    'json',
    path,
  ])
  return JSON.parse(res.stdout.toString()).streams[0]
}

/** Средний цвет в центре кадра, RGB 0–255 */
function centerPixel(path: string): number[] {
  const res = Bun.spawnSync([
    'ffmpeg',
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    path,
    '-vf',
    'crop=8:8:(iw-8)/2:(ih-8)/2,scale=1:1,format=rgb24',
    '-frames:v',
    '1',
    '-f',
    'rawvideo',
    '-',
  ])
  return [...res.stdout.subarray(0, 3)]
}

function maxChannelDiff(a: number[], b: number[]): number {
  return Math.max(...a.map((v, i) => Math.abs(v - (b[i] ?? 0))))
}

// Насыщенный зелёный: на нём ошибка «матрица BT.709 прочитана как BT.601» ~20 единиц
const COLOR_HEX = '0x30C050'
const COLOR_RGB = [48, 192, 80]
// Фактическое отклонение ≤ 4; ошибка матрицы даёт ~20, нетонмапленный HDR — ~50
const TOLERANCE = 8
const CLIP = 'color=c=' + COLOR_HEX + ':s=640x360:d=2:r=10'
const TAG_709 = 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv'

describe.skipIf(!ffmpegAvailable)('транскод настоящим ffmpeg', () => {
  let dir = ''
  let encoders = ''

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'media-transcode-'))
    encoders = ffmpegList('encoders')
  })

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  test('в ffmpeg есть фильтры, без которых воркер не работает', () => {
    const filters = ffmpegList('filters')
    for (const name of ['scale', 'zscale', 'tonemap']) {
      expect({ name, present: has(filters, name) }).toEqual({ name, present: true })
    }
    expect(has(encoders, 'libx264')).toBe(true)
  })

  /** 10-битный мастер: HEVC Main 10, как пишет iPhone (или H.264 High 10, если нет libx265) */
  function tenBitArgs(transfer: string, primaries: string, matrix: string): string[] {
    const codec = has(encoders, 'libx265')
      ? ['-c:v', 'libx265', '-x265-params', 'log-level=error']
      : ['-c:v', 'libx264']
    return [
      ...codec,
      '-crf',
      '8',
      '-pix_fmt',
      'yuv420p10le',
      '-colorspace',
      matrix,
      '-color_primaries',
      primaries,
      '-color_trc',
      transfer,
      '-color_range',
      'tv',
    ]
  }

  async function transcodeAndCheck(source: string, name: string): Promise<void> {
    const out = join(dir, `out-${name}`)
    await mkdir(out, { recursive: true })
    await transcodeToDir(source, out)

    for (const { file } of RENDITIONS) {
      const path = join(out, file)
      const stream = probeStream(path)
      expect({ file, ...stream }).toMatchObject({
        file,
        codec_name: 'h264',
        profile: 'High',
        pix_fmt: 'yuv420p',
        color_range: 'tv',
        color_space: 'bt709',
        color_transfer: 'bt709',
        color_primaries: 'bt709',
      })
      const pixel = centerPixel(path)
      expect({ file, pixel, ok: maxChannelDiff(pixel, COLOR_RGB) <= TOLERANCE })
        .toEqual({ file, pixel, ok: true })
    }

    const poster = centerPixel(join(out, POSTER_FILE))
    expect({ poster, ok: maxChannelDiff(poster, COLOR_RGB) <= TOLERANCE }).toEqual({ poster, ok: true })
  }

  test('SDR 10 бит (BT.709) → High, не High 10', async () => {
    const src = join(dir, 'sdr10.mp4')
    run([
      '-f',
      'lavfi',
      '-i',
      CLIP,
      '-f',
      'lavfi',
      '-i',
      'sine=d=2',
      '-vf',
      `scale=out_color_matrix=bt709:out_range=tv,${TAG_709}`,
      ...tenBitArgs('bt709', 'bt709', 'bt709'),
      '-c:a',
      'aac',
      '-shortest',
      src,
    ])
    expect(probeStream(src).pix_fmt).toBe('yuv420p10le')
    await transcodeAndCheck(src, 'sdr10')
  }, 120_000)

  for (const transfer of ['arib-std-b67', 'smpte2084']) {
    test(`HDR ${transfer} → тонмаппинг, цвет не выцветает`, async () => {
      const src = join(dir, `hdr-${transfer}.mp4`)
      // Белый SDR кладём на 203 нит — опорный белый HDR по BT.2408
      run([
        '-f',
        'lavfi',
        '-i',
        CLIP,
        '-vf',
        `scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,${TAG_709},`
        + `zscale=t=${transfer}:p=bt2020:m=bt2020nc:r=tv:npl=203,format=yuv420p10le`,
        ...tenBitArgs(transfer, 'bt2020', 'bt2020nc'),
        src,
      ])
      expect(probeStream(src).color_transfer).toBe(transfer)
      await transcodeAndCheck(src, `hdr-${transfer}`)
    }, 180_000)
  }

  test('SD BT.601 → пересчёт матрицы в BT.709', async () => {
    const src = join(dir, 'sd601.mp4')
    run([
      '-f',
      'lavfi',
      '-i',
      CLIP.replace('640x360', '640x480'),
      '-vf',
      'scale=out_color_matrix=bt601:out_range=tv,format=yuv420p,'
      + 'setparams=color_primaries=smpte170m:color_trc=smpte170m:colorspace=smpte170m:range=tv',
      '-c:v',
      'libx264',
      '-crf',
      '8',
      src,
    ])
    await transcodeAndCheck(src, 'sd601')
  }, 120_000)

  test('4:2:2 полного диапазона → High 4:2:0 ограниченного', async () => {
    const src = join(dir, 'full422.mp4')
    run([
      '-f',
      'lavfi',
      '-i',
      CLIP,
      '-vf',
      'scale=out_color_matrix=bt709:out_range=pc,format=yuvj422p,'
      + 'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=pc',
      '-c:v',
      'libx264',
      '-crf',
      '8',
      src,
    ])
    expect(probeStream(src).profile).toBe('High 4:2:2')
    await transcodeAndCheck(src, 'full422')
  }, 120_000)

  const av1Encoder = ['libsvtav1', 'libaom-av1'].find((name) => ffmpegAvailable && has(ffmpegList('encoders'), name))

  test.skipIf(!av1Encoder)('AV1 10 бит декодируется и перекодируется', async () => {
    const src = join(dir, 'av1.mp4')
    const speed = av1Encoder === 'libsvtav1' ? ['-preset', '12'] : ['-cpu-used', '8', '-row-mt', '1']
    run([
      '-f',
      'lavfi',
      '-i',
      CLIP.replace('640x360', '320x180').replace('d=2', 'd=1'),
      '-vf',
      `scale=out_color_matrix=bt709:out_range=tv,format=yuv420p10le,${TAG_709}`,
      '-c:v',
      av1Encoder ?? '',
      ...speed,
      '-crf',
      '20',
      '-colorspace',
      'bt709',
      '-color_primaries',
      'bt709',
      '-color_trc',
      'bt709',
      src,
    ])
    expect(probeStream(src).codec_name).toBe('av1')
    await transcodeAndCheck(src, 'av1')
  }, 180_000)

  test('ролик короче секунды — постер всё равно есть', async () => {
    const src = join(dir, 'short.mp4')
    run([
      '-f',
      'lavfi',
      '-i',
      CLIP.replace('d=2', 'd=0.4'),
      '-vf',
      `scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,${TAG_709}`,
      '-c:v',
      'libx264',
      src,
    ])
    await transcodeAndCheck(src, 'short')
  }, 120_000)
})
