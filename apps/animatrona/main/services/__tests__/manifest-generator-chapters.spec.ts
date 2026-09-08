import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DemuxResult } from '../../../shared/types'
import type { ManifestChapter } from '../../../shared/types/manifest'

// unixfs-service → @letar/ipfs-kubo-core тянет живой Kubo-клиент, в vitest он не нужен:
// проверяем, какие именно главы уходят в ChaptersDocument, а не саму загрузку.
const { addBytesMock } = vi.hoisted(() => ({
  addBytesMock: vi.fn(async (_bytes: Buffer) => 'bafyChapters'),
}))
vi.mock('../ipfs/unixfs-service', () => ({ addBytes: addBytesMock }))

// Шрифты берутся из ASS-файлов на диске — в тесте субтитров нет вовсе.
vi.mock('@letar/folder-scan', () => ({ getFontsFromASS: vi.fn(() => []), matchFonts: vi.fn(() => []) }))

import { generateManifestFromDemux } from '../manifest-generator'

let outputDir: string

beforeEach(() => {
  addBytesMock.mockClear()
  outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'animatrona-manifest-'))
})

afterEach(() => {
  fs.rmSync(outputDir, { recursive: true, force: true })
})

function makeDemuxResult(chapters: DemuxResult['metadata']['chapters']): DemuxResult {
  return {
    video: { duration: 1440, width: 1920, height: 1080, codec: 'av1', bitrate: 2_000_000 },
    audioTracks: [],
    subtitles: [],
    metadata: { chapters },
  } as unknown as DemuxResult
}

function makeDetectedChapters(): ManifestChapter[] {
  return [
    { startMs: 0, endMs: 90_000, title: 'Opening', type: 'op', skippable: true },
    { startMs: 1_350_000, endMs: 1_440_000, title: 'Ending', type: 'ed', skippable: true },
  ]
}

async function generate(
  demuxResult: DemuxResult,
  detectedChapters?: ManifestChapter[],
): Promise<{ chaptersCid?: string; uploaded?: ManifestChapter[] }> {
  const result = await generateManifestFromDemux(demuxResult, {
    episodeId: 'ep-1',
    videoPath: path.join(outputDir, 'source.mkv'),
    outputDir,
    animeInfo: { animeName: 'Тест', seasonNumber: 1, episodeNumber: 1 },
    detectedChapters,
  })

  expect(result.success).toBe(true)

  const uploadedArg = addBytesMock.mock.calls[0]?.[0] as Buffer | undefined
  const uploaded = uploadedArg
    ? (JSON.parse(uploadedArg.toString('utf-8')) as { chapters: ManifestChapter[] }).chapters
    : undefined

  const manifest = JSON.parse(fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf-8')) as {
    chaptersCid?: string
  }

  return { chaptersCid: manifest.chaptersCid, uploaded }
}

describe('generateManifestFromDemux — источник глав', () => {
  it('берёт автоопределённые OP/ED, когда в контейнере глав нет', async () => {
    const { chaptersCid, uploaded } = await generate(makeDemuxResult([]), makeDetectedChapters())

    expect(chaptersCid).toBe('bafyChapters')
    expect(uploaded).toEqual(makeDetectedChapters())
  })

  it('оставляет главы контейнера, игнорируя автоопределённые', async () => {
    const containerChapters = [{ start: 0, end: 90, title: 'Intro' }]

    const { uploaded } = await generate(makeDemuxResult(containerChapters), makeDetectedChapters())

    expect(uploaded).toHaveLength(1)
    expect(uploaded?.[0]?.title).toBe('Intro')
  })

  it('не создаёт ChaptersDocument, когда нет ни тех, ни других', async () => {
    const { chaptersCid } = await generate(makeDemuxResult([]))

    expect(chaptersCid).toBeUndefined()
    expect(addBytesMock).not.toHaveBeenCalled()
  })
})
