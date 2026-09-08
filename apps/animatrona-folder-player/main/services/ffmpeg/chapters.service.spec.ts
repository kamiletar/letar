import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { probeChaptersWithFfprobe } from './chapters.service'
import { getFfmpegStatus } from './ffmpeg-installer.service'

vi.mock('node:child_process', () => ({ spawn: vi.fn() }))
vi.mock('./ffmpeg-installer.service', () => ({ getFfmpegStatus: vi.fn() }))

const mockSpawn = vi.mocked(spawn)
const mockGetFfmpegStatus = vi.mocked(getFfmpegStatus)

/** Мини-`ChildProcess` — только то, что использует `probeChaptersWithFfprobe` */
class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter()
  stderr = new EventEmitter()
}

/**
 * Заводит фейковый `ChildProcess` и настраивает `spawn`-мок так, чтобы `emitEvents` запускался
 * уже ПОСЛЕ того, как `probeChaptersWithFfprobe` синхронно навесит свои `.on(...)`-слушатели —
 * иначе `queueMicrotask`, поставленный в очередь до вызова `spawn()`, срабатывает раньше
 * слушателей (весь код между `await getFfmpegStatus()` и `spawn()` асинхронен), события теряются
 * или `'error'` улетает необработанным исключением.
 */
function makeFakeChild(emitEvents: (child: FakeChildProcess) => void): FakeChildProcess {
  const child = new FakeChildProcess()
  mockSpawn.mockImplementation(() => {
    queueMicrotask(() => emitEvents(child))
    return child as unknown as ReturnType<typeof spawn>
  })
  return child
}

/** Эмулирует успешный прогон ffprobe: stdout + close(0) */
function succeed(stdout: string): (child: FakeChildProcess) => void {
  return (child) => {
    child.stdout.emit('data', Buffer.from(stdout))
    child.emit('close', 0)
  }
}

const AVAILABLE_STATUS = {
  available: true,
  source: 'downloaded' as const,
  ffmpegPath: '/path/to/ffmpeg',
  ffprobePath: '/path/to/ffprobe',
  version: 'ffmpeg version 7.0',
  missingDecoders: [],
  installSupported: true,
}

const UNAVAILABLE_STATUS = {
  available: false,
  source: null,
  ffmpegPath: null,
  ffprobePath: null,
  version: null,
  missingDecoders: [],
  installSupported: true,
}

describe('probeChaptersWithFfprobe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('возвращает undefined и не спавнит процесс, если ffmpeg недоступен', async () => {
    mockGetFfmpegStatus.mockResolvedValue(UNAVAILABLE_STATUS)

    const result = await probeChaptersWithFfprobe('/media/file.mkv')

    expect(result).toBeUndefined()
    expect(mockSpawn).not.toHaveBeenCalled()
  })

  it('спавнит ffprobe по пути из статуса с filePath в аргументах', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild(succeed('{"chapters":[]}'))

    await probeChaptersWithFfprobe('/media/file.mkv')

    expect(mockSpawn).toHaveBeenCalledTimes(1)
    const [command, args] = mockSpawn.mock.calls[0]
    expect(command).toBe('/path/to/ffprobe')
    expect(args).toContain('/media/file.mkv')
  })

  it('парсит один чаптер в MediaChapter', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild(
      succeed(
        JSON.stringify({
          chapters: [{ start_time: '0.000000', end_time: '90.500000', tags: { title: 'Opening' } }],
        }),
      ),
    )

    const result = await probeChaptersWithFfprobe('/media/file.mkv')

    expect(result).toEqual([{ start: 0, end: 90.5, title: 'Opening' }])
  })

  it('парсит несколько чаптеров в порядке из JSON', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild(
      succeed(
        JSON.stringify({
          chapters: [
            { start_time: '0.000000', end_time: '90.000000', tags: { title: 'Opening' } },
            { start_time: '90.000000', end_time: '1300.000000', tags: { title: 'Episode' } },
            { start_time: '1300.000000', end_time: '1400.000000', tags: { title: 'Ending' } },
          ],
        }),
      ),
    )

    const result = await probeChaptersWithFfprobe('/media/file.mkv')

    expect(result).toEqual([
      { start: 0, end: 90, title: 'Opening' },
      { start: 90, end: 1300, title: 'Episode' },
      { start: 1300, end: 1400, title: 'Ending' },
    ])
  })

  it('чаптер без tags.title получает пустую строку, не undefined', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild(succeed(JSON.stringify({ chapters: [{ start_time: '0.000000', end_time: '10.000000' }] })))

    const result = await probeChaptersWithFfprobe('/media/file.mkv')

    expect(result).toEqual([{ start: 0, end: 10, title: '' }])
  })

  it('пустой массив chapters даёт undefined, не пустой массив', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild(succeed(JSON.stringify({ chapters: [] })))

    const result = await probeChaptersWithFfprobe('/media/file.mkv')

    expect(result).toBeUndefined()
  })

  it('ненулевой код завершения даёт undefined без выброса ошибки', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild((child) => {
      child.stderr.emit('data', Buffer.from('ffprobe: file not found'))
      child.emit('close', 1)
    })

    await expect(probeChaptersWithFfprobe('/media/file.mkv')).resolves.toBeUndefined()
  })

  it("событие 'error' процесса (например ENOENT) даёт undefined без выброса", async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild((child) => {
      child.emit('error', new Error('spawn /path/to/ffprobe ENOENT'))
    })

    await expect(probeChaptersWithFfprobe('/media/file.mkv')).resolves.toBeUndefined()
  })

  it('невалидный JSON на stdout даёт undefined без выброса', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild(succeed('это не json'))

    await expect(probeChaptersWithFfprobe('/media/file.mkv')).resolves.toBeUndefined()
  })

  it('чаптер с непарсимым start_time/end_time отфильтровывается, остальные остаются', async () => {
    mockGetFfmpegStatus.mockResolvedValue(AVAILABLE_STATUS)
    makeFakeChild(
      succeed(
        JSON.stringify({
          chapters: [
            { start_time: 'n/a', end_time: '90.000000', tags: { title: 'Broken' } },
            { end_time: '1400.000000', tags: { title: 'Missing start' } },
            { start_time: '0.000000', end_time: '90.000000', tags: { title: 'Opening' } },
          ],
        }),
      ),
    )

    const result = await probeChaptersWithFfprobe('/media/file.mkv')

    expect(result).toEqual([{ start: 0, end: 90, title: 'Opening' }])
  })
})
