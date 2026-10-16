import { describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseAudioProbe, transcodeAudio } from '../src/audio-transcode.ts'
import { audioDir } from '../src/audio.ts'
import { runFfprobe, spawnFfmpeg } from '../src/ffmpeg.ts'

describe('обработка аудио', () => {
  it('отклоняет видео, пустое содержимое и превышение длительности', () => {
    for (
      const value of [{}, { streams: [{ codec_type: 'audio' }], format: { duration: 'Infinity' } }, {
        streams: [{ codec_type: 'audio' }],
        format: { duration: '1801' },
      }, { streams: [{ codec_type: 'audio' }, { codec_type: 'video' }], format: { duration: '5' } }]
    ) {
      expect(() => parseAudioProbe(value)).toThrow()
    }
    expect(
      parseAudioProbe({
        streams: [{ codec_type: 'audio' }, { codec_type: 'video', disposition: { attached_pic: 1 } }],
        format: { duration: '5' },
      }),
    ).toEqual({ durationSec: 5 })
  })

  it('кодирует настоящее аудио в AAC, удаляет исходник и не воскрешает удалённое', async () => {
    const dataPath = await mkdtemp(join(tmpdir(), 'audio-transcode-'))
    try {
      const dir = audioDir(dataPath, 'test', 'recording')
      await mkdir(dir, { recursive: true })
      const sourcePath = join(dir, 'source.wav')
      await spawnFfmpeg(['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.2', '-y', sourcePath])
      await transcodeAudio({ appId: 'test', audioId: 'recording', sourcePath }, dataPath)
      expect(JSON.parse(await readFile(join(dir, 'ready.json'), 'utf8')).durationSec).toBeGreaterThan(0)
      const probe = await runFfprobe(['-show_streams', join(dir, 'audio.m4a')]) as { streams: { codec_name: string }[] }
      expect(probe.streams[0]?.codec_name).toBe('aac')
      expect(await Bun.file(sourcePath).exists()).toBe(false)
      await writeFile(join(dir, 'deleted'), '')
      await transcodeAudio({ appId: 'test', audioId: 'recording', sourcePath }, dataPath)
      expect(await Bun.file(join(dir, 'audio.m4a')).exists()).toBe(false)
    } finally {
      await rm(dataPath, { recursive: true, force: true })
    }
  })

  it('отклоняет плейлист вместо аудио, не разрешая чтение соседнего файла', async () => {
    const dataPath = await mkdtemp(join(tmpdir(), 'audio-playlist-'))
    try {
      const dir = audioDir(dataPath, 'test', 'playlist')
      await mkdir(dir, { recursive: true })
      const sourcePath = join(dir, 'source')
      await writeFile(
        sourcePath,
        '#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nfile:../private/audio.m4a\n#EXT-X-ENDLIST\n',
      )
      await expect(transcodeAudio({ appId: 'test', audioId: 'playlist', sourcePath }, dataPath)).rejects.toThrow()
      expect(await Bun.file(join(dir, 'ready.json')).exists()).toBe(false)
      expect(await Bun.file(join(dir, 'audio.m4a')).exists()).toBe(false)
    } finally {
      await rm(dataPath, { recursive: true, force: true })
    }
  })
})
