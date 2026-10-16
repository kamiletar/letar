import { access, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { AUDIO_MAX_DURATION_SEC, audioDir, type AudioJob } from './audio.ts'
import { runFfprobe, spawnFfmpeg } from './ffmpeg.ts'

// Плейлисты и контейнеры-ссылки не должны читать соседние локальные файлы или сеть.
const INPUT_FORMATS = 'mp3,mov,wav,ogg,flac,matroska,webm,aac'

/** Проверяем содержимое, а не расширение; картинка обложки в MP3 допустима. */
export function parseAudioProbe(value: unknown) {
  const probe = value as {
    format?: { duration?: string }
    streams?: { codec_type?: string; disposition?: { attached_pic?: number } }[]
  }
  const durationSec = Number(probe.format?.duration)
  if (
    !probe.streams?.some((stream) => stream.codec_type === 'audio')
    || probe.streams.some((stream) => stream.codec_type === 'video' && !stream.disposition?.attached_pic)
    || !Number.isFinite(durationSec) || durationSec <= 0 || durationSec > AUDIO_MAX_DURATION_SEC
  ) {
    throw new Error('Expected audio, duration 1–1800 seconds')
  }
  return { durationSec }
}

export async function transcodeAudio(job: AudioJob, dataPath: string) {
  const dir = audioDir(dataPath, job.appId, job.audioId)
  const isDeleted = () => access(join(dir, 'deleted')).then(() => true, () => false)
  try {
    if (await isDeleted()) { return }
    const info = parseAudioProbe(
      await runFfprobe([
        '-format_whitelist',
        INPUT_FORMATS,
        '-protocol_whitelist',
        'file,pipe',
        '-show_format',
        '-show_streams',
        job.sourcePath,
      ]),
    )
    await spawnFfmpeg([
      '-v',
      'error',
      '-nostdin',
      '-format_whitelist',
      INPUT_FORMATS,
      '-protocol_whitelist',
      'file,pipe',
      '-i',
      job.sourcePath,
      '-map',
      '0:a:0',
      '-vn',
      '-map_metadata',
      '-1',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-ac',
      '2',
      '-movflags',
      '+faststart',
      '-t',
      String(AUDIO_MAX_DURATION_SEC),
      '-y',
      join(dir, 'audio.m4a'),
    ])
    if (await isDeleted()) { return }
    await writeFile(join(dir, 'ready.json'), JSON.stringify(info))
    await rm(job.sourcePath, { force: true })
  } catch (error) {
    await writeFile(join(dir, 'error'), 'Audio processing failed')
    await rm(job.sourcePath, { force: true })
    await rm(join(dir, 'audio.m4a'), { force: true })
    throw error
  } finally {
    if (await isDeleted()) {
      for (const file of ['source', 'audio.m4a', 'ready.json']) { await rm(join(dir, file), { force: true }) }
    }
  }
}
