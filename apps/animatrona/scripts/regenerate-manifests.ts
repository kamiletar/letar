/**
 * Скрипт: регенерация всех EpisodeManifest в IPFS
 *
 * Полная синхронизация манифестов с БД:
 * - Обновляет CID'ы видео, аудио, субтитров, шрифтов
 * - Добавляет треки из БД, которых нет в манифесте
 * - Удаляет из манифеста треки, которых нет в БД
 * - Синхронизирует метаданные (title, language, dubGroup)
 *
 * Запуск: bun apps/animatrona/scripts/regenerate-manifests.ts
 */

import { createClient } from '@libsql/client'

const KUBO_API = 'http://127.0.0.1:5011/api/v0'
const DB_PATH = 'file:C:/Users/Kami/AppData/Roaming/@letar/animatrona/data/app.db'

/** Kubo cat — получить содержимое по CID */
async function ipfsCat(cid: string): Promise<Buffer> {
  const res = await fetch(`${KUBO_API}/cat?arg=${cid}`, { method: 'POST' })
  if (!res.ok) throw new Error(`cat ${cid}: ${res.status} ${res.statusText}`)
  return Buffer.from(await res.arrayBuffer())
}

/** Kubo add — добавить содержимое и получить CID */
async function ipfsAdd(data: Buffer): Promise<string> {
  const formData = new FormData()
  formData.append('file', new Blob([data]))
  const res = await fetch(`${KUBO_API}/add?pin=true&cid-version=1`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error(`add: ${res.status} ${res.statusText}`)
  const result = (await res.json()) as { Hash: string }
  return result.Hash
}

interface EpisodeRow {
  id: string
  number: number
  manifestCid: string
  transcodedCid: string | null
  animeName: string
  animeId: string
}

interface AudioTrackRow {
  episodeId: string
  streamIndex: number
  language: string
  title: string | null
  codec: string
  channels: string
  bitrate: number | null
  isDefault: number // SQLite boolean
  dubGroup: string | null
  transcodedCid: string | null
}

interface SubtitleTrackRow {
  id: string
  episodeId: string
  streamIndex: number
  language: string
  title: string | null
  format: string
  subtitleType: string
  isDefault: number // SQLite boolean
  dubGroup: string | null
  fileCid: string | null
}

interface FontRow {
  subtitleTrackId: string
  fontName: string
  fileCid: string | null
}

async function main() {
  console.log('🔄 Регенерация EpisodeManifest (полная синхронизация с БД)...')
  console.log(`📁 БД: ${DB_PATH}`)
  console.log(`🌐 Kubo API: ${KUBO_API}`)

  // Проверяем Kubo
  try {
    const idRes = await fetch(`${KUBO_API}/id`, { method: 'POST' })
    if (!idRes.ok) throw new Error('Kubo не отвечает')
    console.log('✅ Kubo работает')
  } catch {
    console.error('❌ Kubo не доступен! Запустите Animatrona Desktop.')
    process.exit(1)
  }

  // Подключаемся к SQLite
  const db = createClient({ url: DB_PATH })
  console.log('✅ Подключено к БД')

  // Получаем все эпизоды с manifestCid
  const episodesResult = await db.execute(`
    SELECT e.id, e.number, e.manifestCid, e.transcodedCid, a.name as animeName, a.id as animeId
    FROM Episode e
    JOIN Anime a ON e.animeId = a.id
    WHERE e.manifestCid IS NOT NULL
    ORDER BY a.name, e.number
  `)
  const episodes = episodesResult.rows as unknown as EpisodeRow[]
  console.log(`📋 Найдено эпизодов с манифестами: ${episodes.length}`)

  // Получаем ВСЕ аудиодорожки с полными метаданными
  const audioResult = await db.execute(`
    SELECT episodeId, streamIndex, language, title, codec, channels, bitrate, isDefault, dubGroup, transcodedCid
    FROM AudioTrack
    ORDER BY episodeId, streamIndex
  `)
  const audioTracks = audioResult.rows as unknown as AudioTrackRow[]
  console.log(`🔊 Аудиодорожек в БД: ${audioTracks.length}`)

  // Получаем ВСЕ субтитры с полными метаданными
  const subtitleResult = await db.execute(`
    SELECT id, episodeId, streamIndex, language, title, format, subtitleType, isDefault, dubGroup, fileCid
    FROM SubtitleTrack
    ORDER BY episodeId, streamIndex
  `)
  const subtitleTracks = subtitleResult.rows as unknown as SubtitleTrackRow[]
  console.log(`📝 Субтитров в БД: ${subtitleTracks.length}`)

  // Получаем шрифты
  const fontResult = await db.execute(`
    SELECT subtitleTrackId, fontName, fileCid FROM SubtitleFont WHERE fileCid IS NOT NULL
  `)
  const fonts = fontResult.rows as unknown as FontRow[]
  console.log(`🔤 Шрифтов в БД: ${fonts.length}`)

  let updated = 0
  let skipped = 0
  let failed = 0
  let tracksAdded = 0
  let tracksRemoved = 0
  const affectedAnimeIds = new Set<string>()

  for (const ep of episodes) {
    try {
      // Читаем манифест из IPFS
      const manifestBuf = await ipfsCat(ep.manifestCid)
      const manifest = JSON.parse(manifestBuf.toString('utf-8'))
      let changed = false

      // 1. Обновляем video CID
      if (ep.transcodedCid) {
        if (manifest.video.cid !== ep.transcodedCid) {
          manifest.video.cid = ep.transcodedCid
          changed = true
        }
        if (manifest.video.path) {
          delete manifest.video.path
          changed = true
        }
      }

      // 2. Синхронизация аудиодорожек
      const epAudio = audioTracks.filter((a) => a.episodeId === ep.id)
      const dbAudioIndexes = new Set(epAudio.map((a) => a.streamIndex))
      const manifestAudioIndexes = new Set((manifest.audioTracks || []).map((t: any) => t.streamIndex))

      // Обновляем существующие треки
      if (manifest.audioTracks) {
        for (const track of manifest.audioTracks) {
          const dbTrack = epAudio.find((a) => a.streamIndex === track.streamIndex)
          if (dbTrack?.transcodedCid && track.cid !== dbTrack.transcodedCid) {
            track.cid = dbTrack.transcodedCid
            changed = true
          }
          // Синхронизируем метаданные
          if (dbTrack) {
            if (dbTrack.language && track.language !== dbTrack.language) {
              track.language = dbTrack.language
              changed = true
            }
            if (dbTrack.title && track.title !== dbTrack.title) {
              track.title = dbTrack.title
              changed = true
            }
            if (dbTrack.dubGroup !== null && track.dubGroup !== dbTrack.dubGroup) {
              track.dubGroup = dbTrack.dubGroup
              changed = true
            }
            // Синхронизируем кодек и каналы (после транскодирования могут отличаться)
            if (dbTrack.codec && track.codec !== dbTrack.codec) {
              track.codec = dbTrack.codec
              changed = true
            }
            if (dbTrack.channels && track.channels !== dbTrack.channels) {
              track.channels = dbTrack.channels
              changed = true
            }
          }
          // Удаляем локальные пути
          if (track.extractedPath) {
            delete track.extractedPath
            changed = true
          }
          if (track.transcodedPath) {
            delete track.transcodedPath
            changed = true
          }
          if (track.transcodeStatus) {
            delete track.transcodeStatus
            changed = true
          }
        }
      } else {
        manifest.audioTracks = []
      }

      // Добавляем треки из БД, которых нет в манифесте
      for (const dbTrack of epAudio) {
        if (!manifestAudioIndexes.has(dbTrack.streamIndex) && dbTrack.transcodedCid) {
          manifest.audioTracks.push({
            id: `audio-${dbTrack.streamIndex}`,
            streamIndex: dbTrack.streamIndex,
            language: dbTrack.language || 'und',
            title: dbTrack.title || `Audio ${dbTrack.streamIndex + 1}`,
            codec: dbTrack.codec,
            channels: dbTrack.channels,
            bitrate: dbTrack.bitrate || undefined,
            isDefault: !!dbTrack.isDefault,
            cid: dbTrack.transcodedCid,
            dubGroup: dbTrack.dubGroup || undefined,
          })
          changed = true
          tracksAdded++
          console.log(`    + аудио [${dbTrack.streamIndex}] ${dbTrack.title || dbTrack.language}`)
        }
      }

      // Удаляем из манифеста треки, которых нет в БД
      const beforeAudioLen = manifest.audioTracks.length
      manifest.audioTracks = manifest.audioTracks.filter((t: any) => dbAudioIndexes.has(t.streamIndex))
      if (manifest.audioTracks.length !== beforeAudioLen) {
        tracksRemoved += beforeAudioLen - manifest.audioTracks.length
        changed = true
      }

      // Сортируем по streamIndex
      manifest.audioTracks.sort((a: any, b: any) => a.streamIndex - b.streamIndex)

      // 3. Синхронизация субтитров
      const epSubs = subtitleTracks.filter((s) => s.episodeId === ep.id)
      const dbSubIndexes = new Set(epSubs.map((s) => s.streamIndex))
      const manifestSubIndexes = new Set((manifest.subtitleTracks || []).map((t: any) => t.streamIndex))

      // Обновляем существующие треки
      if (manifest.subtitleTracks) {
        for (const track of manifest.subtitleTracks) {
          const dbTrack = epSubs.find((s) => s.streamIndex === track.streamIndex)
          if (dbTrack?.fileCid && track.cid !== dbTrack.fileCid) {
            track.cid = dbTrack.fileCid
            changed = true
          }
          // Синхронизируем метаданные
          if (dbTrack) {
            if (dbTrack.language && track.language !== dbTrack.language) {
              track.language = dbTrack.language
              changed = true
            }
            if (dbTrack.title && track.title !== dbTrack.title) {
              track.title = dbTrack.title
              changed = true
            }
            if (dbTrack.dubGroup !== null && track.dubGroup !== dbTrack.dubGroup) {
              track.dubGroup = dbTrack.dubGroup
              changed = true
            }
          }
          if (track.filePath) {
            delete track.filePath
            changed = true
          }

          // 4. Обновляем шрифты
          if (track.fonts && dbTrack) {
            const dbFonts = fonts.filter((f) => f.subtitleTrackId === dbTrack.id)
            for (const font of track.fonts) {
              const dbFont = dbFonts.find((f) => f.fontName === font.name)
              if (dbFont?.fileCid && font.cid !== dbFont.fileCid) {
                font.cid = dbFont.fileCid
                changed = true
              }
              if (font.path) {
                delete font.path
                changed = true
              }
            }
          }
        }
      } else {
        manifest.subtitleTracks = []
      }

      // Добавляем субтитры из БД, которых нет в манифесте
      for (const dbTrack of epSubs) {
        if (!manifestSubIndexes.has(dbTrack.streamIndex) && dbTrack.fileCid) {
          const dbFonts = fonts.filter((f) => f.subtitleTrackId === dbTrack.id)
          manifest.subtitleTracks.push({
            id: `sub-${dbTrack.streamIndex}`,
            streamIndex: dbTrack.streamIndex,
            language: dbTrack.language || 'und',
            title: dbTrack.title || `Subtitles ${dbTrack.streamIndex + 1}`,
            format: dbTrack.format,
            isDefault: !!dbTrack.isDefault,
            cid: dbTrack.fileCid,
            dubGroup: dbTrack.dubGroup || undefined,
            fonts: dbFonts
              .filter((f) => f.fileCid)
              .map((f) => ({
                name: f.fontName,
                cid: f.fileCid,
                fileExt: f.fileExt !== 'ttf' ? f.fileExt : undefined,
              })),
          })
          changed = true
          tracksAdded++
          console.log(`    + субтитры [${dbTrack.streamIndex}] ${dbTrack.title || dbTrack.language}`)
        }
      }

      // Удаляем из манифеста субтитры, которых нет в БД
      const beforeSubLen = manifest.subtitleTracks.length
      manifest.subtitleTracks = manifest.subtitleTracks.filter((t: any) => dbSubIndexes.has(t.streamIndex))
      if (manifest.subtitleTracks.length !== beforeSubLen) {
        tracksRemoved += beforeSubLen - manifest.subtitleTracks.length
        changed = true
      }

      // Сортируем по streamIndex
      manifest.subtitleTracks.sort((a: any, b: any) => a.streamIndex - b.streamIndex)

      if (!changed) {
        skipped++
        continue
      }

      // Обновляем дату
      manifest.generatedAt = new Date().toISOString()

      // Загружаем обратно в IPFS
      const newCid = await ipfsAdd(Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'))

      // Обновляем в БД
      await db.execute({
        sql: 'UPDATE Episode SET manifestCid = ? WHERE id = ?',
        args: [newCid, ep.id],
      })

      updated++
      affectedAnimeIds.add(ep.animeId)
      console.log(
        `  ✅ ${ep.animeName} ep${ep.number}: ${ep.manifestCid.slice(0, 12)}... → ${newCid.slice(0, 12)}... `
          + `(audio: ${manifest.audioTracks.length}, subs: ${manifest.subtitleTracks.length})`,
      )
    } catch (e) {
      failed++
      console.error(`  ❌ ${ep.animeName} ep${ep.number}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log(`\n📊 Результат:`)
  console.log(`  обновлено: ${updated}`)
  console.log(`  пропущено: ${skipped}`)
  console.log(`  ошибки: ${failed}`)
  console.log(`  треков добавлено: ${tracksAdded}`)
  console.log(`  треков удалено: ${tracksRemoved}`)
  console.log(`  затронуто аниме: ${affectedAnimeIds.size}`)

  if (affectedAnimeIds.size > 0) {
    console.log(
      '\n⚠️  Перезапустите Animatrona Desktop и вызовите publisher:publish для обновления AnimeManifest и IPNS',
    )
  }

  db.close()
}

main().catch(console.error)
