/**
 * AnimeDirectoryBuilder — Построение IPFS-директории аниме из существующих CID
 *
 * Создаёт виртуальную IPFS-директорию, объединяющую ВСЕ файлы аниме
 * (видео, аудио, субтитры, шрифты, манифесты, картинки, JSON-документы)
 * в одну структуру. Один рекурсивный pin на директорию защищает весь контент от GC.
 *
 * Цель: всё, на что ссылаются манифесты транзитивно, физически лежит в этой
 * директории как UnixFS-линки. После `pin add directoryCid` Kubo пинит ВСЕ
 * блоки за один вызов — никакой ручной обход CID не нужен.
 *
 * Структура:
 *   <animeDirCid>/
 *     manifest.json          ← AnimeManifest JSON (единственный JSON в корне)
 *     poster.webp            ← Постер (CID из БД)
 *     meta/                  ← Служебные JSON-документы
 *       info.json            ← AnimeInfo JSON
 *       episodes.json        ← EpisodesDocument (manifest.episodesCid)
 *       franchise-graph.json ← FranchiseGraphDocument
 *       relations.json       ← RelationsDocument
 *       episode-previews.json ← EpisodePreviewsDocument
 *     images/
 *       studios/{slug}.webp     ← AnimeInfo.studios[].imageCid
 *       persons/{slug}.webp     ← AnimeInfo.staff[].imageCid
 *       characters/{slug}.webp  ← AnimeInfo.characters[].imageCid
 *     episodes/
 *       01/
 *         manifest.json      ← EpisodeManifest JSON (единственный JSON в корне эпизода)
 *         video.webm         ← Видео
 *         meta/              ← Служебные JSON эпизода
 *           encoding.json
 *           chapters.json
 *           thumbnails.json  ← ThumbnailsDocument (seek-bar)
 *           metadata.json    ← ffprobe metadata
 *         audio/             ← {lang}_{dubGroup}.m4a
 *         subs/              ← {lang}_{dubGroup}.ass
 *         fonts/             ← font0.ttf, font1.otf (дедупликация по CID)
 *         thumbnails/        ← sprite.webp, sprite.vtt (seek-bar)
 *         thumbnails-img/    ← 001.webp, 002.webp (мелкие 320px-превью)
 *         screenshots/       ← 01.webp ... (полноразмерные)
 *       02/
 *         ...
 */

import type {
  AnimeInfo,
  AnimeManifest,
  AnimeManifestCharacter,
  AnimeManifestPerson,
  AnimeManifestStudio,
} from '@letar/animatrona-types'
import type { EpisodeManifest } from '../../../shared/types/manifest'
import { prisma } from '../../utils/db'
import { createModuleLogger } from '../../utils/logger'

import { getKuboService } from '../kubo'
import { regenerationState } from '../regeneration-state'
import {
  recoverChapters,
  recoverShikimoriImage,
  recoverSprite,
  recoverThumbnailsImg,
  regenerateMetadataJson,
} from './cid-recovery'
import type { DirEntry } from './unified-ipfs-service'
import { addBytes, cat, createDirectoryFromCids, probeCidAvailable, safeCat, stat } from './unified-ipfs-service'

const log = createModuleLogger('AnimeDirectoryBuilder')

/** Информация о потерянном CID для отчёта пользователю */
export interface MissingCidEntry {
  /** Тип потерянного контента */
  kind:
    | 'video'
    | 'audio'
    | 'sub'
    | 'sprite'
    | 'vtt'
    | 'thumb-img'
    | 'metadata'
    | 'image-studio'
    | 'image-person'
    | 'image-character'
    | 'sub-doc'
    | 'poster'
  /** Старый CID который оказался недоступен */
  cid: string
  /** Номер эпизода (для per-episode потерь) */
  episodeNumber?: number
  /** Описание для UI: имя файла, имя сущности и т.д. */
  detail?: string
}

/** Информация о потерянном шрифте — пользователь должен сам найти и добавить */
export interface MissingFontEntry {
  episodeNumber: number
  fileExt: string
  oldCid: string
}

/** Информация о восстановленном CID */
export interface RecoveredCidEntry {
  kind: string
  oldCid: string
  newCid: string
  via: 'shikimori' | 'sprite-from-video' | 'downscale-from-video' | 'regen-from-db'
}

/** Результат построения директории */
export interface BuildAnimeDirectoryResult {
  /** CID корневой IPFS-директории аниме */
  directoryCid: string
  /** true если directoryCid изменился по сравнению с предыдущим значением в БД */
  changed: boolean
  /** Количество эпизодов включённых в директорию */
  episodeCount: number
  /** Общее количество IPFS блоков (для прогресса пиннинга) */
  totalBlocks: number
  /** Общий размер в байтах */
  totalSize: number
  /** Невосстановимые потери — пропущены в директории */
  missingCids: MissingCidEntry[]
  /** Потерянные шрифты — пользователь восстанавливает руками */
  missingFonts: MissingFontEntry[]
  /** Восстановленные CID — успешные регенерации */
  recovered: RecoveredCidEntry[]
}

/**
 * Построить IPFS-директорию аниме из существующих CID в БД
 *
 * Не скачивает файлы — использует MFS `files.cp` для lazy-линковки.
 * Все CID берутся из БД (Episode, AudioTrack, SubtitleTrack, SubtitleFont).
 *
 * @param animeId - ID аниме в БД
 * @returns CID созданной директории
 */
export async function buildAnimeDirectory(
  animeId: string,
  options?: {
    /** Переопределить CID manifest.json (используется когда новый манифест только что сгенерирован, но ещё не в директории) */
    manifestCidOverride?: string
  },
): Promise<BuildAnimeDirectoryResult> {
  log.info('Построение IPFS-директории аниме', { animeId })

  // Загружаем все данные из БД
  const anime = await prisma.anime.findUnique({
    where: { id: animeId },
    include: {
      poster: { select: { cid: true } },
      episodes: {
        orderBy: { number: 'asc' },
        include: {
          audioTracks: {
            where: { transcodedCid: { not: null } },
            select: {
              language: true,
              dubGroup: true,
              transcodedCid: true,
            },
          },
          subtitleTracks: {
            where: { fileCid: { not: null } },
            select: {
              language: true,
              dubGroup: true,
              fileCid: true,
              format: true,
              fonts: {
                where: { fileCid: { not: null } },
                select: { fileCid: true, fileExt: true },
              },
            },
          },
        },
      },
    },
  })

  if (!anime) {
    throw new Error(`Аниме не найдено: ${animeId}`)
  }

  // Определяем CID manifest.json: явный override → stat из directoryCid
  let resolvedManifestCid: string | null = options?.manifestCidOverride ?? null
  if (!resolvedManifestCid) {
    if (!anime.directoryCid) {
      throw new Error(`У аниме "${anime.name}" нет directoryCid — требуется ребилд через generateAnimeManifest`)
    }
    try {
      const manifestStat = await stat(`${anime.directoryCid}/manifest.json`)
      resolvedManifestCid = manifestStat.cid
    } catch {
      throw new Error(`У аниме "${anime.name}" не удалось получить manifest.json из directoryCid`)
    }
  }

  const entries: DirEntry[] = []
  const missingCids: MissingCidEntry[] = []
  const missingFonts: MissingFontEntry[] = []
  const recovered: RecoveredCidEntry[] = []

  /**
   * Лог детали в стейт регенерации (виден в UI live).
   * No-op когда регенерация не активна — чтобы не засорять стейт при обычных вызовах
   * (импорт, single anime update).
   */
  const detail = (level: 'info' | 'warn' | 'success' | 'error', message: string, meta?: Record<string, unknown>) => {
    if (regenerationState.getStatus().isRegenerating) {
      regenerationState.appendLog(level, message, meta)
    }
  }

  // Сразу логируем имя аниме — чтобы в UI было видно что именно обрабатывается
  detail('info', `── ${anime.name} (${anime.episodes.length} эп.) ──`)

  /**
   * Проверить достижимость CID и при необходимости попытаться восстановить.
   * - Если CID жив (probe < 5с) → возвращает оригинальный CID
   * - Если мёртв и есть recover функция → пытается восстановить, при успехе → новый CID
   * - Иначе → null + регистрация в missingCids
   */
  async function probeOrRecover(
    cid: string,
    opts: {
      kind: MissingCidEntry['kind']
      episodeNumber?: number
      detail?: string
      recover?: () => Promise<string | null>
      recoverVia?: RecoveredCidEntry['via']
    },
  ): Promise<string | null> {
    const alive = await probeCidAvailable(cid, 5000)
    if (alive) {
      return cid
    }
    const epLabel = opts.episodeNumber ? `эп.${opts.episodeNumber} ` : ''
    const desc = opts.detail ?? opts.kind
    detail('warn', `   ⚠ ${epLabel}${desc}: CID недоступен (${cid.slice(0, 12)}…)`)
    if (opts.recover) {
      detail('info', `   ↻ ${epLabel}${desc}: восстанавливаю через ${opts.recoverVia ?? 'regen-from-db'}…`)
      const newCid = await opts.recover()
      if (newCid && newCid !== cid) {
        recovered.push({ kind: opts.kind, oldCid: cid, newCid, via: opts.recoverVia ?? 'regen-from-db' })
        detail('success', `   ✓ ${epLabel}${desc}: восстановлен → ${newCid.slice(0, 12)}…`)
        return newCid
      }
      detail('error', `   ✗ ${epLabel}${desc}: восстановить не удалось`)
    }
    missingCids.push({
      kind: opts.kind,
      cid,
      episodeNumber: opts.episodeNumber,
      detail: opts.detail,
    })
    return null
  }

  // 1. manifest.json — AnimeManifest (ссылка на существующий CID)
  entries.push({
    name: 'manifest.json',
    type: 'file',
    cid: resolvedManifestCid,
  })

  // 3. poster.webp (если есть)
  const posterCid = anime.posterCid ?? anime.poster?.cid
  if (posterCid) {
    entries.push({
      name: 'poster.webp',
      type: 'file',
      cid: posterCid,
    })
  }

  // 3.5. meta/ — все служебные JSON-документы (info, episodes, relations, etc.).
  // В корне directoryCid остаётся только основной manifest.json + poster.webp + папки.
  const animeManifest = await parseAnimeManifest(resolvedManifestCid)
  const metaChildren: DirEntry[] = []

  // info.json — AnimeInfo (каноничные неизменяемые метаданные)
  if (anime.animeInfoCid) {
    metaChildren.push({ name: 'info.json', type: 'file', cid: anime.animeInfoCid })
  }

  if (animeManifest) {
    const subDocs = [
      { cid: animeManifest.episodesCid, name: 'episodes.json' },
      { cid: animeManifest.franchiseGraphCid, name: 'franchise-graph.json' },
      { cid: animeManifest.relationsCid, name: 'relations.json' },
      { cid: animeManifest.episodePreviewsCid, name: 'episode-previews.json' },
    ]
    for (const doc of subDocs) {
      if (!doc.cid) continue
      const cid = await probeOrRecover(doc.cid, { kind: 'sub-doc', detail: `meta/${doc.name}` })
      if (cid) {
        metaChildren.push({ name: doc.name, type: 'file', cid })
      }
    }
  }
  if (metaChildren.length > 0) {
    entries.push({ name: 'meta', type: 'directory', children: metaChildren })
  }

  // 3.6. images/ — изображения студий, персонала, персонажей из AnimeInfo.
  // Probe + при потере re-fetch с Shikimori через imageUrl.
  const animeInfo = await parseAnimeInfo(anime.animeInfoCid)
  if (animeInfo) {
    const allEntities = [...(animeInfo.studios ?? []), ...(animeInfo.staff ?? []), ...(animeInfo.characters ?? [])]
    const withCid = allEntities.filter((e) => (e as { imageCid?: string }).imageCid).length
    if (withCid > 0) {
      detail('info', `   → images: проверяю ${withCid}/${allEntities.length} изображений…`)
      const imagesEntry = await buildImagesEntriesWithRecovery(animeInfo, probeOrRecover)
      if (imagesEntry) {
        const imgCount = imagesEntry.children?.length ?? 0
        detail('info', `   ✓ images: ${imgCount} категорий`)
        entries.push(imagesEntry)
      }
    } else {
      detail('info', `   — images: не загружались (0/${allEntities.length} с imageCid)`)
    }
  }

  // 4. episodes/ — директория с эпизодами
  const episodesDir: DirEntry = {
    name: 'episodes',
    type: 'directory',
    children: [],
  }

  let episodeCount = 0

  // 4.0. Pre-pass: восстановление глав (chapters.json) на уровне аниме
  // detectIntros требует ≥2 эпизода с живой аудиодорожкой для сравнения fingerprints.
  // Строим Map<episodeId, chaptersCid> — приоритет: ep.chaptersCid (БД) → Episode parsedManifest.chaptersCid.
  // Если ≥1 chapters мёртв И есть ≥2 живых аудиодорожек → запускаем recoverChapters один раз.
  const parsedManifestCache = new Map<string, EpisodeManifest | null>()
  const chaptersByEp = new Map<string, string>() // episodeId → chaptersCid (final)
  const epsWithMissingChapters: typeof anime.episodes = []
  const epsWithAudio: Array<(typeof anime.episodes)[number] & { audioCid: string }> = []
  const videoEps = anime.episodes.filter((ep) => ep.transcodedCid)
  detail('info', `   ↻ chapters: проверяю ${videoEps.length} эп.…`)
  // Параллельный pre-pass: все эпизоды проверяются одновременно, а не по очереди.
  // Для 25 эп. с мёртвыми chapters сокращает время с ~250s (последовательно) до ~5s.
  // Логируем только проблемные эпизоды, здоровые суммируем в одну строку после.
  const deadManifestEps: number[] = []
  const deadChapterEps: number[] = []
  await Promise.all(
    anime.episodes.map(async (ep) => {
      if (!ep.transcodedCid) return
      let parsed: EpisodeManifest | null = null
      if (ep.manifestCid) {
        parsed = await parseEpisodeManifest(ep.manifestCid)
        parsedManifestCache.set(ep.id, parsed)
        if (!parsed) {
          deadManifestEps.push(ep.number)
        }
      }
      const candidateChaptersCid = ep.chaptersCid ?? parsed?.chaptersCid
      if (candidateChaptersCid) {
        const alive = await probeCidAvailable(candidateChaptersCid, 5000)
        if (alive) {
          chaptersByEp.set(ep.id, candidateChaptersCid)
          return
        }
        deadChapterEps.push(ep.number)
      }
      // Либо CID нет, либо мёртв — кандидат на recovery
      epsWithMissingChapters.push(ep)
      if (ep.durationMs && ep.audioTracks.length > 0) {
        // Японская дорожка приоритетнее, иначе первая доступная
        const track = ep.audioTracks.find((t) => t.language === 'jpn' || t.language === 'ja') ?? ep.audioTracks[0]
        if (track?.transcodedCid) {
          epsWithAudio.push({ ...ep, audioCid: track.transcodedCid })
        }
      }
    }),
  )

  // Итог pre-pass: логируем только проблемы, иначе — кратко
  if (deadManifestEps.length > 0) {
    detail('warn', `   ⚠ chapters: манифест мёртв у эп. [${deadManifestEps.join(', ')}]`)
  }
  if (deadChapterEps.length > 0) {
    detail(
      'warn',
      `   ⚠ chapters: мёртвых ${deadChapterEps.length} (эп. [${deadChapterEps.slice(0, 10).join(', ')}${
        deadChapterEps.length > 10 ? '…' : ''
      }])`,
    )
  }
  const aliveCount = chaptersByEp.size
  const noChapterCount = videoEps.length - aliveCount - deadChapterEps.length
  if (aliveCount === videoEps.length) {
    detail('info', `   ✓ chapters: все ${aliveCount} живых`)
  } else if (aliveCount > 0 || noChapterCount > 0) {
    const parts: string[] = []
    if (aliveCount > 0) parts.push(`${aliveCount} живых`)
    if (noChapterCount > 0) parts.push(`${noChapterCount} без глав`)
    if (deadChapterEps.length > 0) parts.push(`${deadChapterEps.length} мёртвых`)
    detail('info', `   — chapters: ${parts.join(', ')}`)
  }

  // Если хотя бы у одного эпизода есть живые главы — эпизоды без глав
  // просто не имеют их (спешлы, рекапы и т.п.), восстанавливать не нужно.
  if (chaptersByEp.size > 0 && epsWithMissingChapters.length > 0) {
    detail(
      'info',
      `   — chapters: ${epsWithMissingChapters.length} эп. без глав при ${chaptersByEp.size} с главами — считаем что их просто нет, recovery пропускаем`,
    )
    epsWithMissingChapters.length = 0
    epsWithAudio.length = 0
  }

  const skipDetect = false

  if (!skipDetect && epsWithMissingChapters.length > 0 && epsWithAudio.length >= 2) {
    detail(
      'info',
      `   ↻ chapters: ${epsWithMissingChapters.length} эп. без живых глав, запускаю detectIntros по ${epsWithAudio.length} аудиодорожкам…`,
    )
    try {
      // Параллельный probe аудиодорожек — 25 × 5s последовательно → 5s суммарно
      const probedAudio = (
        await Promise.all(
          epsWithAudio.map(async (ep) => {
            const alive = await probeCidAvailable(ep.audioCid, 5000)
            return alive
              ? { id: ep.id, audioCid: ep.audioCid, durationMs: ep.durationMs as number, number: ep.number }
              : null
          }),
        )
      ).filter((ep): ep is NonNullable<typeof ep> => ep !== null)
      detail('info', `     проверка доступности: ${probedAudio.length}/${epsWithAudio.length} аудиодорожек живых`)
      if (probedAudio.length >= 2) {
        const recoveredMap = await recoverChapters({ episodes: probedAudio, onDetail: detail })
        // Сохраняем в БД + в локальный chaptersByEp
        for (const [episodeId, newCid] of recoveredMap) {
          chaptersByEp.set(episodeId, newCid)
          try {
            await prisma.episode.update({
              where: { id: episodeId },
              data: { chaptersCid: newCid },
            })
          } catch (err) {
            log.warn('Не удалось сохранить chaptersCid в БД', { episodeId, error: String(err) })
          }
          recovered.push({
            kind: 'sub-doc',
            oldCid: '(missing chapters)',
            newCid,
            via: 'detect-intros',
          })
        }
        detail(
          'success',
          `   ✓ chapters: восстановлено через detectIntros для ${recoveredMap.size}/${epsWithMissingChapters.length} эпизодов`,
        )
      } else {
        detail('warn', `   ⚠ chapters: только ${probedAudio.length} живых аудиодорожек, нужно ≥2 — пропускаем`)
      }
    } catch (err) {
      detail('error', `   ✗ chapters: recovery failed — ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  for (const ep of anime.episodes) {
    // Пропускаем эпизоды без видео в IPFS
    if (!ep.transcodedCid) {
      continue
    }

    const padLen = Math.max(2, String(anime.episodes.length).length)
    const epDirName = String(ep.number).padStart(padLen, '0')
    const epChildren: DirEntry[] = []

    // Не логируем per-episode "строю" — только итог всех эпизодов в конце цикла

    // video.webm
    epChildren.push({
      name: 'video.webm',
      type: 'file',
      cid: ep.transcodedCid,
    })

    // manifest.json эпизода — только если жив (pre-pass уже проверил).
    // Мёртвый manifest.json вызывает зависание files.cp в createDirectoryFromCids:
    // Kubo пытается достать блок из сети без таймаута.
    if (ep.manifestCid) {
      const manifestAlive = !parsedManifestCache.has(ep.id) || parsedManifestCache.get(ep.id) !== null
      if (manifestAlive) {
        epChildren.push({
          name: 'manifest.json',
          type: 'file',
          cid: ep.manifestCid,
        })
      } else {
        detail('warn', `   ⚠ эп.${ep.number}: manifest.json мёртв — пропускаю (избегаю зависания files.cp)`)
      }
    }

    // audio/ — отдельные аудиодорожки
    const audioChildren: DirEntry[] = []
    const audioNamesUsed = new Set<string>()
    for (const track of ep.audioTracks) {
      if (!track.transcodedCid) {
        continue
      }
      let fileName = buildTrackFileName(track.language, track.dubGroup, 'm4a')

      // Дедупликация имён при коллизиях
      if (audioNamesUsed.has(fileName)) {
        const base = fileName.slice(0, -(4 + 1))
        let counter = 2
        while (audioNamesUsed.has(`${base}_${counter}.m4a`)) {
          counter++
        }
        fileName = `${base}_${counter}.m4a`
      }
      audioNamesUsed.add(fileName)

      audioChildren.push({
        name: fileName,
        type: 'file',
        cid: track.transcodedCid,
      })
    }
    if (audioChildren.length > 0) {
      epChildren.push({
        name: 'audio',
        type: 'directory',
        children: audioChildren,
      })
    }

    // subs/ — субтитры
    const subsChildren: DirEntry[] = []
    const subsNamesUsed = new Set<string>()
    const fontsMap = new Map<string, string>() // CID → filename (дедупликация)

    for (const track of ep.subtitleTracks) {
      if (!track.fileCid) {
        continue
      }
      const ext = track.format || 'ass'
      let fileName = buildTrackFileName(track.language, track.dubGroup, ext)

      // Дедупликация имён: und.ass → und_2.ass → und_3.ass
      if (subsNamesUsed.has(fileName)) {
        const base = fileName.slice(0, -(ext.length + 1)) // "und" из "und.ass"
        let counter = 2
        while (subsNamesUsed.has(`${base}_${counter}.${ext}`)) {
          counter++
        }
        fileName = `${base}_${counter}.${ext}`
      }
      subsNamesUsed.add(fileName)

      subsChildren.push({
        name: fileName,
        type: 'file',
        cid: track.fileCid,
      })

      // Собираем шрифты (дедупликация по CID)
      for (const font of track.fonts) {
        if (font.fileCid && !fontsMap.has(font.fileCid)) {
          const ext = font.fileExt || 'ttf'
          fontsMap.set(font.fileCid, `font${fontsMap.size}.${ext}`)
        }
      }
    }
    if (subsChildren.length > 0) {
      epChildren.push({
        name: 'subs',
        type: 'directory',
        children: subsChildren,
      })
    }

    // fonts/ — шрифты с probe (дедуплицированные). Без recovery — мёртвые шрифты
    // в missingFonts отчёт; пользователь сам найдёт и докинет через "Добавить дорожки".
    if (fontsMap.size > 0) {
      const fontsChildren: DirEntry[] = []
      for (const [fontCid, fileName] of fontsMap) {
        const alive = await probeCidAvailable(fontCid, 5000)
        if (alive) {
          fontsChildren.push({
            name: fileName,
            type: 'file',
            cid: fontCid,
          })
        } else {
          const ext = fileName.includes('.') ? (fileName.split('.').pop() ?? 'ttf') : 'ttf'
          missingFonts.push({
            episodeNumber: ep.number,
            fileExt: ext,
            oldCid: fontCid,
          })
          detail('warn', `   ⚠ эп.${ep.number} шрифт ${fileName}: потерян (${fontCid.slice(0, 12)}…)`)
        }
      }
      if (fontsChildren.length > 0) {
        epChildren.push({
          name: 'fonts',
          type: 'directory',
          children: fontsChildren,
        })
      }
    }

    // Парсим EpisodeManifest один раз для metadata
    // Используем кешированный parsedManifest из pre-pass'а (для chapters recovery)
    const parsedManifest = parsedManifestCache.has(ep.id)
      ? (parsedManifestCache.get(ep.id) ?? null)
      : await parseEpisodeManifest(ep.manifestCid)

    if (parsedManifest) {
      // encoding.json, chapters.json, thumbnails.json (JSON-doc), metadata.json — кладём в meta/ поддиректорию
      // (manifest.json остаётся в корне эпизода как основной манифест)
      const epDocs: Array<{
        name: string
        cid: string | undefined
        kind: MissingCidEntry['kind']
        recover?: () => Promise<string | null>
        recoverVia?: RecoveredCidEntry['via']
      }> = [
        { name: 'encoding.json', cid: parsedManifest.encodingCid, kind: 'sub-doc' },
        // chapters.json: приоритет — recovered/Episode.chaptersCid (из pre-pass), иначе parsedManifest
        { name: 'chapters.json', cid: chaptersByEp.get(ep.id) ?? parsedManifest.chaptersCid, kind: 'sub-doc' },
        { name: 'thumbnails.json', cid: parsedManifest.thumbnailsCid, kind: 'sub-doc' },
        {
          name: 'metadata.json',
          cid: parsedManifest.metadataCid,
          kind: 'metadata',
          recover: () =>
            regenerateMetadataJson({
              durationMs: ep.durationMs,
              videoWidth: ep.videoWidth,
              videoHeight: ep.videoHeight,
              videoBitDepth: ep.videoBitDepth,
            }),
          recoverVia: 'regen-from-db',
        },
      ]
      const epMetaChildren: DirEntry[] = []
      for (const doc of epDocs) {
        if (!doc.cid) continue
        const finalCid = await probeOrRecover(doc.cid, {
          kind: doc.kind,
          episodeNumber: ep.number,
          detail: `meta/${doc.name}`,
          recover: doc.recover,
          recoverVia: doc.recoverVia,
        })
        if (finalCid) {
          epMetaChildren.push({ name: doc.name, type: 'file', cid: finalCid })
        }
      }
      if (epMetaChildren.length > 0) {
        epChildren.push({ name: 'meta', type: 'directory', children: epMetaChildren })
      }

      // thumbnails/ — sprite.webp + sprite.vtt. При потере — recover через video.webm.
      // Источники CID в порядке приоритета:
      //  1. Episode.spriteCid / vttCid (БД) — обновляются при recovery, переживают регенерацию
      //  2. parsedManifest.thumbnails (legacy inline)
      //  3. ThumbnailsDocument JSON по parsedManifest.thumbnailsCid
      let thumbs: { spriteCid?: string; vttCid?: string } | undefined
      if (ep.spriteCid || ep.vttCid) {
        thumbs = { spriteCid: ep.spriteCid ?? undefined, vttCid: ep.vttCid ?? undefined }
      } else if (parsedManifest.thumbnails) {
        thumbs = parsedManifest.thumbnails
      } else if (parsedManifest.thumbnailsCid) {
        try {
          const buf = await safeCat(parsedManifest.thumbnailsCid, 5000)
          if (buf) {
            const doc = JSON.parse(buf.toString('utf-8')) as { thumbnails?: { spriteCid?: string; vttCid?: string } }
            thumbs = doc.thumbnails
          }
        } catch (err) {
          log.debug('Не удалось прочитать ThumbnailsDocument', {
            cid: parsedManifest.thumbnailsCid,
            error: String(err),
          })
        }
      }
      if (thumbs?.spriteCid || thumbs?.vttCid) {
        // Если хоть один из (sprite, vtt) мёртв — регенерируем оба разом из video
        let spriteCid: string | null = null
        let vttCid: string | null = null
        let regenerated: { spriteCid: string; vttCid: string } | null = null

        const tryRegenSprite = async (): Promise<{ spriteCid: string; vttCid: string } | null> => {
          if (regenerated) return regenerated
          if (!ep.transcodedCid || !ep.durationMs) {
            detail('warn', `   ⚠ эп.${ep.number}: нет video.webm в БД, sprite не восстановить`)
            return null
          }
          detail('info', `   ↻ эп.${ep.number}: probe video.webm для регенерации sprite…`)
          const videoAlive = await probeCidAvailable(ep.transcodedCid, 5000)
          if (!videoAlive) {
            detail('warn', `   ⚠ эп.${ep.number}: video.webm тоже недоступен, sprite потерян`)
            return null
          }
          detail('info', `   ⬇ эп.${ep.number}: качаю video.webm из IPFS, генерирую sprite ffmpeg'ом…`)
          regenerated = await recoverSprite({
            videoCid: ep.transcodedCid,
            durationMs: ep.durationMs,
          })
          if (regenerated) {
            detail('success', `   ✓ эп.${ep.number}: sprite + vtt пересозданы из video`)
            // Сохраняем новые CID в БД — иначе следующая регенерация снова
            // увидит мёртвые CID в ThumbnailsDocument и заново пойдёт качать видео.
            try {
              await prisma.episode.update({
                where: { id: ep.id },
                data: { spriteCid: regenerated.spriteCid, vttCid: regenerated.vttCid },
              })
              log.info('Episode.spriteCid/vttCid обновлены в БД', {
                episodeId: ep.id,
                episodeNumber: ep.number,
              })
            } catch (dbError) {
              log.warn('Не удалось сохранить spriteCid/vttCid в БД', {
                episodeId: ep.id,
                error: String(dbError),
              })
            }
          } else {
            detail('error', `   ✗ эп.${ep.number}: ffmpeg sprite — не удалось`)
          }
          return regenerated
        }

        if (thumbs.spriteCid) {
          spriteCid = await probeOrRecover(thumbs.spriteCid, {
            kind: 'sprite',
            episodeNumber: ep.number,
            detail: 'sprite.webp',
            recover: async () => (await tryRegenSprite())?.spriteCid ?? null,
            recoverVia: 'sprite-from-video',
          })
        }
        if (thumbs.vttCid) {
          vttCid = await probeOrRecover(thumbs.vttCid, {
            kind: 'vtt',
            episodeNumber: ep.number,
            detail: 'sprite.vtt',
            recover: async () => (await tryRegenSprite())?.vttCid ?? null,
            recoverVia: 'sprite-from-video',
          })
        }

        const thumbnailEntries: DirEntry[] = []
        if (spriteCid) thumbnailEntries.push({ name: 'sprite.webp', type: 'file', cid: spriteCid })
        if (vttCid) thumbnailEntries.push({ name: 'sprite.vtt', type: 'file', cid: vttCid })
        if (thumbnailEntries.length > 0) {
          epChildren.push({
            name: 'thumbnails',
            type: 'directory',
            children: thumbnailEntries,
          })
        }
      }

      // screenshots/ — полноразмерные скриншоты из манифеста или БД
      const screenshotCids = parsedManifest.screenshotCids
        ?? (ep.screenshotCids ? (JSON.parse(ep.screenshotCids) as string[]) : [])
      if (screenshotCids.length > 0) {
        const screenshotEntries: DirEntry[] = screenshotCids.map((cid: string, i: number) => ({
          name: `${String(i + 1).padStart(2, '0')}.webp`,
          type: 'file' as const,
          cid,
        }))
        epChildren.push({
          name: 'screenshots',
          type: 'directory',
          children: screenshotEntries,
        })
      }
    }

    // thumbnails-img/ — мелкие 320px-превью. При потере регенерируем из video.webm
    // (или скипаем если video тоже недоступен).
    if (ep.thumbnailCids) {
      try {
        const thumbnailCids = JSON.parse(ep.thumbnailCids) as string[]
        if (Array.isArray(thumbnailCids) && thumbnailCids.length > 0) {
          // Probe thumbnail CID и video CID параллельно — экономим 5s на эпизод при dead thumbnails
          const aliveCids: string[] = []
          let anyDead = false
          const videoProbePromise = ep.transcodedCid && ep.durationMs
            ? probeCidAvailable(ep.transcodedCid, 5000)
            : Promise.resolve(false)
          await Promise.all(
            thumbnailCids.map(async (cid) => {
              const alive = await probeCidAvailable(cid, 5000)
              if (alive) {
                aliveCids.push(cid)
              } else {
                anyDead = true
              }
            }),
          )

          let finalCids = aliveCids
          // Если хоть один мёртв и у нас есть video.webm — регенерируем все заново
          if (anyDead && ep.transcodedCid && ep.durationMs) {
            const deadCount = thumbnailCids.length - aliveCids.length
            detail(
              'info',
              `   ↻ эп.${ep.number}: ${deadCount}/${thumbnailCids.length} thumbnails-img мёртвы, regen из video…`,
            )
            const videoAlive = await videoProbePromise
            if (videoAlive) {
              detail('info', `   ⬇ эп.${ep.number}: качаю video.webm для thumbnails-img…`)
              const regenerated = await recoverThumbnailsImg({
                videoCid: ep.transcodedCid,
                durationMs: ep.durationMs,
                count: thumbnailCids.length,
              })
              if (regenerated) {
                finalCids = regenerated
                for (const oldCid of thumbnailCids) {
                  recovered.push({
                    kind: 'thumb-img',
                    oldCid,
                    newCid: regenerated[0],
                    via: 'downscale-from-video',
                  })
                }
                detail('success', `   ✓ эп.${ep.number}: thumbnails-img пересозданы (${regenerated.length} шт.)`)
                // Сохраняем новые CID в БД — иначе следующая регенерация снова попробует их probe и заново загрузит видео
                try {
                  await prisma.episode.update({
                    where: { id: ep.id },
                    data: { thumbnailCids: JSON.stringify(regenerated) },
                  })
                  log.info('Episode.thumbnailCids обновлены в БД', {
                    episodeId: ep.id,
                    episodeNumber: ep.number,
                    count: regenerated.length,
                  })
                } catch (dbError) {
                  log.warn('Не удалось обновить Episode.thumbnailCids в БД', {
                    episodeId: ep.id,
                    error: String(dbError),
                  })
                }
              } else {
                // Регенерация не удалась — записываем потери
                for (const cid of thumbnailCids) {
                  if (!aliveCids.includes(cid)) {
                    missingCids.push({
                      kind: 'thumb-img',
                      cid,
                      episodeNumber: ep.number,
                      detail: 'thumbnails-img',
                    })
                  }
                }
              }
            } else {
              for (const cid of thumbnailCids) {
                if (!aliveCids.includes(cid)) {
                  missingCids.push({
                    kind: 'thumb-img',
                    cid,
                    episodeNumber: ep.number,
                    detail: 'thumbnails-img (video also missing)',
                  })
                }
              }
            }
          }

          if (finalCids.length > 0) {
            const padNum = Math.max(3, String(finalCids.length).length)
            const thumbnailImgEntries: DirEntry[] = finalCids.map((cid, i) => ({
              name: `${String(i + 1).padStart(padNum, '0')}.webp`,
              type: 'file' as const,
              cid,
            }))
            epChildren.push({
              name: 'thumbnails-img',
              type: 'directory',
              children: thumbnailImgEntries,
            })
          }
        }
      } catch {
        log.warn('Не удалось распарсить thumbnailCids', { episodeId: ep.id })
      }
    }

    // Краткая сводка по эпизоду — только предупреждения, суммарный итог ниже после цикла

    episodesDir.children!.push({
      name: epDirName,
      type: 'directory',
      children: epChildren,
    })
    episodeCount++
  }

  if (episodesDir.children!.length > 0) {
    entries.push(episodesDir)
  }

  // Итог по эпизодам — одна строка вместо N строк per-episode
  detail('info', `   ✓ эпизоды: ${episodeCount} построено`)

  // Создаём виртуальную директорию
  log.info('Создаю IPFS-директорию', {
    animeName: anime.name,
    episodeCount,
    totalEntries: entries.length,
  })
  detail('info', `   → публикую IPFS-директорию (${episodeCount} эп., ${entries.length} корневых записей)…`)

  // Первый проход: собираем директорию без directory stats в manifest
  const directoryCid1 = await createDirectoryFromCids(entries)

  // Получаем cumulativeSize из files.stat (мгновенный, рекурсивный размер)
  // blocks вычисляем из размера
  const IPFS_BLOCK_SIZE = 262144 // 256 KiB — размер блока по умолчанию в IPFS
  let totalBlocks = 0
  let totalSize = 0
  try {
    const dirStat = await stat(directoryCid1)
    totalSize = dirStat.cumulativeSize
    totalBlocks = Math.ceil(totalSize / IPFS_BLOCK_SIZE)
  } catch (e) {
    log.warn('Не удалось получить stat для директории', { directoryCid: directoryCid1, error: e })
  }

  // Второй проход: записываем directory stats в manifest → пересобираем директорию
  let directoryCid = directoryCid1
  if (totalBlocks > 0) {
    try {
      const manifestEntry = entries.find((e) => e.name === 'manifest.json')
      if (manifestEntry?.cid) {
        // Читаем текущий manifest, добавляем directory stats
        const manifestBuf = await cat(manifestEntry.cid)
        const manifestJson = JSON.parse(manifestBuf.toString('utf-8'))
        manifestJson.directoryBlocks = totalBlocks
        manifestJson.directorySize = totalSize
        // Публикуем обновлённый manifest
        // pin: false — updatedManifestCid сразу попадёт в directoryCid (пересборка ниже)
        const updatedManifestCid = await addBytes(Buffer.from(JSON.stringify(manifestJson, null, 2), 'utf-8'), {
          pin: false,
        })
        manifestEntry.cid = updatedManifestCid
        // Пересобираем директорию с обновлённым manifest
        directoryCid = await createDirectoryFromCids(entries)
        log.info('Двухпроходная сборка: directory stats добавлены в manifest', { totalBlocks, totalSize })
      }
    } catch (e) {
      log.warn('Не удалось обновить manifest с directorySize', { error: e })
      // Не фатально — directory без stats в manifest всё равно работоспособна
    }
  }

  // Локальный pin.add пропущен намеренно.
  // Весь контент (видео/аудио/субтитры/изображения) уже был запинен при загрузке через addBytes/addFile.
  // Пиннинг directoryCid — задача пин-сервера (Pinata), который получит новый CID через механизм публикации.
  // pin.add на 6920 МБ занимает до 90 секунд и не даёт никакой дополнительной защиты.

  const sizeMb = totalSize > 0 ? ` (${(totalSize / 1024 / 1024).toFixed(0)} MB)` : ''
  detail('success', `   ✓ директория: ${directoryCid.slice(0, 20)}…${sizeMb}`)
  log.info('IPFS-директория создана', {
    animeName: anime.name,
    directoryCid,
    episodeCount,
    totalBlocks,
    totalSize,
    missingCids: missingCids.length,
    missingFonts: missingFonts.length,
    recovered: recovered.length,
  })

  if (missingCids.length > 0 || missingFonts.length > 0 || recovered.length > 0) {
    log.info('Сводка восстановления', {
      animeName: anime.name,
      missingCids: missingCids.map((m) => `${m.kind}:${m.detail ?? m.cid}`).slice(0, 20),
      missingFonts: missingFonts.map((f) => `ep${f.episodeNumber} ${f.fileExt}`).slice(0, 20),
      recovered: recovered.map((r) => `${r.kind}/${r.via}`).slice(0, 20),
    })
    // Краткая сводка в детальный лог (одна строка для UI)
    const parts: string[] = []
    if (recovered.length > 0) parts.push(`восстановлено ${recovered.length}`)
    if (missingCids.length > 0) parts.push(`потеряно ${missingCids.length}`)
    if (missingFonts.length > 0) parts.push(`шрифтов нет ${missingFonts.length}`)
    detail('info', `   Σ ${parts.join(', ')}`)
  }

  const changed = directoryCid !== anime.directoryCid
  if (!changed) {
    detail('info', '   — директория не изменилась, обновление БД не требуется')
  }

  return {
    directoryCid,
    changed,
    episodeCount,
    totalBlocks,
    totalSize,
    missingCids,
    missingFonts,
    recovered,
  }
}

/**
 * Построить имя файла для аудио/субтитров
 *
 * Формат: {language}_{dubGroup}.{ext}
 * Пробелы и спецсимволы заменяются на underscore.
 * Если dubGroup отсутствует: {language}.{ext}
 */
function buildTrackFileName(language: string, dubGroup: string | null, ext: string): string {
  if (dubGroup) {
    const sanitized = dubGroup.replace(/[\s/\\:*?"<>|]+/g, '_')
    return `${language}_${sanitized}.${ext}`
  }
  return `${language}.${ext}`
}

/**
 * Прочитать и распарсить AnimeManifest из IPFS
 *
 * Возвращает null если manifestCid не задан или чтение не удалось.
 */
async function parseAnimeManifest(animeManifestCid: string | null): Promise<AnimeManifest | null> {
  if (!animeManifestCid) {
    return null
  }
  try {
    const content = await safeCat(animeManifestCid, 8_000)
    if (!content) return null
    return JSON.parse(content.toString('utf-8')) as AnimeManifest
  } catch (error) {
    log.warn('Не удалось прочитать AnimeManifest', {
      manifestCid: animeManifestCid,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Прочитать и распарсить AnimeInfo из IPFS
 *
 * Возвращает null если animeInfoCid не задан или чтение не удалось.
 */
async function parseAnimeInfo(animeInfoCid: string | null): Promise<AnimeInfo | null> {
  if (!animeInfoCid) {
    return null
  }
  try {
    const content = await safeCat(animeInfoCid, 8_000)
    if (!content) return null
    return JSON.parse(content.toString('utf-8')) as AnimeInfo
  } catch (error) {
    log.warn('Не удалось прочитать AnimeInfo', {
      infoCid: animeInfoCid,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * Сделать безопасное имя файла из произвольной строки
 *
 * "A-1 Pictures" → "a-1-pictures"
 * "Madhouse / Studio Pierrot" → "madhouse-studio-pierrot"
 */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/giu, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed'
  )
}

type ProbeOrRecoverFn = (
  cid: string,
  opts: {
    kind: MissingCidEntry['kind']
    episodeNumber?: number
    detail?: string
    recover?: () => Promise<string | null>
    recoverVia?: RecoveredCidEntry['via']
  },
) => Promise<string | null>

/**
 * Построить записи изображений из AnimeInfo с probe + recovery через Shikimori.
 *
 * Для каждого imageCid:
 * 1. probe — если жив, используем как есть
 * 2. если мёртв, но есть imageUrl у сущности — re-download c Shikimori, upload в IPFS
 * 3. если совсем не получилось — пропускаем + missingCids
 *
 * Дедупликация по итоговому CID (после возможной замены).
 */
async function buildImagesEntriesWithRecovery(
  info: AnimeInfo,
  probeOrRecover: ProbeOrRecoverFn,
): Promise<DirEntry | null> {
  const cidToPath = new Map<string, string>()
  const usedNames = new Map<string, Set<string>>() // category → set of used filenames

  function reserveSlot(category: 'studios' | 'persons' | 'characters', name: string): string {
    const namesInCategory = usedNames.get(category) ?? new Set<string>()
    if (!usedNames.has(category)) {
      usedNames.set(category, namesInCategory)
    }
    const baseSlug = slugify(name)
    let fileName = `${baseSlug}.webp`
    let counter = 2
    while (namesInCategory.has(fileName)) {
      fileName = `${baseSlug}_${counter}.webp`
      counter++
    }
    namesInCategory.add(fileName)
    return fileName
  }

  /**
   * Фаза 1: параллельный probe/recovery для одной сущности.
   * Не трогает cidToPath и reserveSlot — только возвращает итоговый CID.
   */
  async function probeEntity(
    category: 'studios' | 'persons' | 'characters',
    kind: MissingCidEntry['kind'],
    entity: AnimeManifestStudio | AnimeManifestPerson | AnimeManifestCharacter,
  ): Promise<{ category: 'studios' | 'persons' | 'characters'; entity: typeof entity; finalCid: string | null }> {
    const oldCid = entity.imageCid ?? null
    let finalCid: string | null = null

    if (!oldCid) {
      // imageCid нет — первичная загрузка с Shikimori если есть imageUrl
      if (!entity.imageUrl) return { category, entity, finalCid: null }
      detail('info', `   → ${category}/${entity.name}: загружаю с Shikimori…`)
      finalCid = await recoverShikimoriImage({
        imageUrl: entity.imageUrl,
        entityKey: `${category}-${entity.id ?? slugify(entity.name)}`,
      })
      if (!finalCid) {
        detail('warn', `   ✗ ${category}/${entity.name}: не удалось загрузить с Shikimori`)
        return { category, entity, finalCid: null }
      }
      detail('success', `   ✓ ${category}/${entity.name}: загружено`)
      recovered.push({ kind, oldCid: '(none)', newCid: finalCid, via: 'shikimori' })
    } else {
      // imageCid есть — probe + recovery при смерти
      const recover = entity.imageUrl
        ? () =>
          recoverShikimoriImage({
            imageUrl: entity.imageUrl as string,
            entityKey: `${category}-${entity.id ?? slugify(entity.name)}`,
          })
        : undefined
      finalCid = await probeOrRecover(oldCid, {
        kind,
        detail: `${category}/${entity.name}`,
        recover,
        recoverVia: 'shikimori',
      })
    }

    // Если CID изменился (recovery сработал) — сохраняем новый в БД
    if (finalCid && finalCid !== oldCid && entity.id) {
      try {
        if (category === 'studios') {
          await prisma.shikimoriStudio.update({ where: { shikimoriId: entity.id }, data: { imageCid: finalCid } })
        } else if (category === 'persons') {
          await prisma.shikimoriPerson.update({ where: { shikimoriId: entity.id }, data: { imageCid: finalCid } })
        } else {
          await prisma.shikimoriCharacter.update({ where: { shikimoriId: entity.id }, data: { imageCid: finalCid } })
        }
        log.info(`${category}.imageCid обновлён в БД`, { shikimoriId: entity.id, name: entity.name })
      } catch (dbError) {
        log.warn(`Не удалось сохранить ${category}.imageCid в БД`, { shikimoriId: entity.id, error: String(dbError) })
      }
    }

    return { category, entity, finalCid }
  }

  // Фаза 1: параллельный probe всех изображений.
  // 168 изображений × 5с последовательно = 840с; параллельно — ~5-10с суммарно.
  const probeResults = await Promise.all([
    ...(info.studios ?? []).map((e) => probeEntity('studios', 'image-studio', e)),
    ...(info.staff ?? []).map((e) => probeEntity('persons', 'image-person', e)),
    ...(info.characters ?? []).map((e) => probeEntity('characters', 'image-character', e)),
  ])

  // Фаза 2: последовательное назначение слотов (reserveSlot не потокобезопасен — нужен порядок)
  for (const { category, entity, finalCid } of probeResults) {
    if (!finalCid) continue
    if (cidToPath.has(finalCid)) continue // уже добавлен (другая сущность с тем же CID)
    const fileName = reserveSlot(category, entity.name)
    cidToPath.set(finalCid, `${category}/${fileName}`)
  }

  if (cidToPath.size === 0) {
    return null
  }

  // Группируем по категориям
  const subdirs = new Map<string, DirEntry[]>()
  for (const [cid, relPath] of cidToPath) {
    const [category, fileName] = relPath.split('/')
    const list = subdirs.get(category) ?? []
    list.push({ name: fileName, type: 'file', cid })
    if (!subdirs.has(category)) {
      subdirs.set(category, list)
    }
  }

  const children: DirEntry[] = []
  for (const [category, files] of subdirs) {
    children.push({ name: category, type: 'directory', children: files })
  }

  return { name: 'images', type: 'directory', children }
}

/**
 * Прочитать и распарсить EpisodeManifest из IPFS
 *
 * Возвращает null если manifestCid не задан или чтение не удалось.
 */
async function parseEpisodeManifest(episodeManifestCid: string | null): Promise<EpisodeManifest | null> {
  if (!episodeManifestCid) {
    return null
  }

  try {
    const content = await safeCat(episodeManifestCid, 8_000)
    if (!content) return null
    return JSON.parse(content.toString('utf-8')) as EpisodeManifest
  } catch (error) {
    log.warn('Не удалось прочитать EpisodeManifest', {
      manifestCid: episodeManifestCid,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
