/**
 * AnimeManifest Generator — Главный оркестратор генерации манифестов для IPFS
 *
 * AnimeInfo — неизменяемые метаданные аниме (название, жанры, студии, персонал).
 * CID AnimeInfo = каноничный идентификатор аниме.
 *
 * AnimeManifest — данные конкретной раздачи (эпизоды, озвучка, качество).
 * Ссылается на AnimeInfo через animeInfoCid.
 *
 * Workflow:
 * 1. Загружает базовые данные аниме из БД
 * 2. Если есть shikimoriId — дозапрашивает данные из Shikimori (GraphQL + REST)
 * 3. Генерирует AnimeInfo → публикует в IPFS → получает animeInfoCid
 * 4. Собирает AnimeManifest с animeInfoCid + inline-данные (backward compat)
 * 5. Публикует AnimeManifest в IPFS
 * 6. Возвращает CID
 */

import type {
  ANIME_MANIFEST_VERSION,
  AnimeManifest,
  AnimeManifestEpisode,
  AnimeManifestGenre,
  AnimeManifestRelation,
  EpisodePreview,
  EpisodePreviewsDocument,
  EpisodesDocument,
  FranchiseGraphDocument,
  GenerateAnimeManifestInput,
  GenerateAnimeManifestResult,
  RelationsDocument,
} from '../../shared/types/anime-manifest'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'
import { buildAnimeInfo } from './anime-info-generator'
import { pinSubDocuments } from './ipfs/pin-sub-documents'
import { addBytes, cat } from './ipfs/unixfs-service'
import { getKuboService } from './kubo'
import { regenerationState } from './regeneration-state'
import { getAnimeExtended, getAnimeRestData, getAnimeWithRelated } from './shikimori'
import { extractExternalIds } from './shikimori-mapper'
import { getFranchiseGraph } from './shikimori/franchise-api'
import type { ShikimoriAnimeExtended } from './shikimori/types'
import { upsertAnimeRelations } from './utils/anime-relation-upsert'

const log = createModuleLogger('AnimeManifestGenerator')

/** Вывести сообщение в UI-лог регенерации (если активна) */
function detail(level: 'info' | 'warn' | 'success' | 'error', message: string): void {
  if (regenerationState.getStatus().isRegenerating) {
    regenerationState.appendLog(level, message)
  }
}

/**
 * Транслитерация и генерация slug из названия
 * Дублирует логику из genre.action.ts (renderer), т.к. main process не может вызывать server actions
 */
function generateSlug(name: string): string {
  const translitMap: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'kh',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }
  return name
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] || char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Сохранить жанры и темы из Shikimori в БД (main process)
 *
 * Вызывается при генерации манифеста, если жанры в БД пустые
 * но Shikimori данные доступны.
 */
async function saveShikimoriGenresToDb(
  animeId: string,
  shikimoriGenres: Array<{ id: string; name: string; russian: string; kind: string }>
): Promise<void> {
  for (const genreData of shikimoriGenres) {
    const shikimoriId = parseInt(genreData.id, 10)
    const name = genreData.russian || genreData.name

    if (genreData.kind === 'theme') {
      const theme = await prisma.theme.upsert({
        where: { shikimoriId },
        create: { name, nameRu: genreData.russian || null, shikimoriId },
        update: { name, nameRu: genreData.russian || null },
      })
      try {
        await prisma.themeOnAnime.create({ data: { animeId, themeId: theme.id } })
      } catch {
        // Игнорируем дубликаты
      }
    } else {
      const slug = generateSlug(name)
      const genre = await prisma.genre.upsert({
        where: { shikimoriId },
        create: { name, slug, shikimoriId },
        update: { name },
      })
      try {
        await prisma.genreOnAnime.create({ data: { animeId, genreId: genre.id } })
      } catch {
        // Игнорируем дубликаты
      }
    }
  }
  log.info('Жанры из Shikimori сохранены в БД', { animeId, count: shikimoriGenres.length })
}

// === Реэкспорт публичного API из подмодулей ===
export { importAnimeFromManifest } from './anime-importer'
export { generateAnimeInfo } from './anime-info-generator'
export {
  getAnimeInfoFromIpfs,
  getAnimeManifestFromIpfs,
  getEpisodePreviewsDocFromIpfs,
  getEpisodesDocFromIpfs,
  getFranchiseGraphDocFromIpfs,
  getRelationsDocFromIpfs,
} from './ipfs-document-reader'

/**
 * Генерировать AnimeManifest из данных БД и опубликовать в IPFS
 *
 * @param input - Параметры генерации
 * @returns Результат с CID манифеста
 */
export async function generateAnimeManifest(input: GenerateAnimeManifestInput): Promise<GenerateAnimeManifestResult> {
  const { animeId, creatorPeerId, skipShikimoriRefresh, forceUpdatedAt } = input

  try {
    log.info('Генерация AnimeManifest', { animeId, skipShikimoriRefresh })

    // Загружаем данные аниме из БД
    // Примечание: модели studios, staff, characters, fandubbers, fansubbers,
    // externalLinks, videos удалены из БД (Фаза 3 минимизации)
    // Эти данные теперь хранятся только в IPFS манифесте
    let anime = await prisma.anime.findUnique({
      where: { id: animeId },
      include: {
        poster: true,
        genres: { include: { genre: true } },
        themes: { include: { theme: true } },
        episodes: {
          orderBy: { number: 'asc' },
          include: {
            season: true,
          },
        },
      },
    })

    if (!anime) {
      return { success: false, error: 'Аниме не найдено' }
    }

    // === Запрашиваем расширенные данные из Shikimori API ===
    // При skipShikimoriRefresh=true пропускаем если animeInfoCid уже есть в БД —
    // это экономит ~2 HTTP запроса на аниме при batch-регенерации (167 аниме = ~334 запроса меньше)
    let shikimoriData: ShikimoriAnimeExtended | null = null
    let shikimoriDataFailed = false
    const canSkipShikimori = skipShikimoriRefresh && !!anime.animeInfoCid
    if (anime.shikimoriId && !canSkipShikimori) {
      try {
        detail('info', `   ↻ Shikimori GraphQL: студии, персонал, персонажи…`)
        log.info('Запрос расширенных данных из Shikimori', { shikimoriId: anime.shikimoriId })
        shikimoriData = await getAnimeExtended(anime.shikimoriId)
        if (shikimoriData) {
          const studios = shikimoriData.studios?.length ?? 0
          const staff = shikimoriData.personRoles?.length ?? 0
          const chars = shikimoriData.characterRoles?.length ?? 0
          log.info('Получены данные из Shikimori', {
            studios,
            staff,
            characters: chars,
            videos: shikimoriData.videos?.length ?? 0,
          })
          detail('info', `   ✓ Shikimori GraphQL: ${studios} студий, ${staff} персонала, ${chars} персонажей`)
        }
      } catch (error) {
        shikimoriDataFailed = true
        detail('warn', `   ⚠ Shikimori GraphQL: ошибка — ${error instanceof Error ? error.message : String(error)}`)
        log.warn('Не удалось получить данные из Shikimori, продолжаем без них', {
          shikimoriId: anime.shikimoriId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    } else if (canSkipShikimori) {
      log.info('Shikimori API пропущен (skipShikimoriRefresh, animeInfoCid есть в БД)', { animeId })
    }

    // === Запрашиваем source через REST API ===
    let restSource: string | null = null
    if (anime.shikimoriId && !canSkipShikimori) {
      try {
        detail('info', `   ↻ Shikimori REST: source…`)
        const restData = await getAnimeRestData(anime.shikimoriId)
        restSource = restData?.source ?? null
        if (restSource) {
          log.info('Получен source из REST API', { source: restSource })
          detail('info', `   ✓ source: ${restSource}`)
        }
      } catch (error) {
        log.warn('Не удалось получить source из REST API', {
          shikimoriId: anime.shikimoriId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Если жанры в БД пустые, но Shikimori вернул — сохраняем в БД
    if (anime.genres.length === 0 && shikimoriData?.genres?.length) {
      log.info('Жанры в БД пустые, сохраняем из Shikimori', {
        animeId,
        shikimoriGenresCount: shikimoriData.genres.length,
      })
      await saveShikimoriGenresToDb(animeId, shikimoriData.genres)
      // Перезагружаем с жанрами
      const refreshed = await prisma.anime.findUnique({
        where: { id: animeId },
        include: {
          genres: { include: { genre: true } },
          themes: { include: { theme: true } },
        },
      })
      if (refreshed) {
        anime = { ...anime, genres: refreshed.genres, themes: refreshed.themes }
      }
    }

    // Собираем жанры (из БД, т.к. они используются для фильтрации)
    const genres: AnimeManifestGenre[] = anime.genres.map((g) => ({
      name: g.genre.slug,
      nameRu: g.genre.name,
      id: g.genre.shikimoriId ?? undefined,
      slug: g.genre.slug,
    }))

    // Собираем темы (из БД)
    const themes: AnimeManifestGenre[] = anime.themes.map((t) => ({
      name: t.theme.name,
      nameRu: t.theme.nameRu ?? undefined,
      id: t.theme.shikimoriId ?? undefined,
    }))

    // External IDs — из shikimoriId + извлекаем из ссылок Shikimori
    const externalIds = extractExternalIds(anime.shikimoriId, shikimoriData?.externalLinks)

    // === Генерируем AnimeInfo и публикуем в IPFS ===
    // При skipShikimoriRefresh и наличии кешированного CID в БД — переиспользуем его
    let animeInfoCid: string
    let animeInfo: Awaited<ReturnType<typeof buildAnimeInfo>> | null = null
    if (canSkipShikimori && anime.animeInfoCid) {
      animeInfoCid = anime.animeInfoCid
      log.info('AnimeInfo из кеша БД', { animeId, animeInfoCid })
    } else if (shikimoriDataFailed && anime.animeInfoCid) {
      // Shikimori временно недоступен — сохраняем существующий animeInfoCid
      // чтобы не перезаписывать данные с полным Shikimori на пустые данные
      animeInfoCid = anime.animeInfoCid
      detail('info', `   → AnimeInfo: сохранён из кеша (Shikimori недоступен)`)
      log.info('AnimeInfo из кеша БД (Shikimori недоступен)', { animeId, animeInfoCid })
    } else {
      animeInfo = await buildAnimeInfo({
        name: anime.name,
        originalName: anime.originalName ?? undefined,
        nameEn: anime.nameEn ?? undefined,
        synonyms: anime.synonyms ? JSON.parse(anime.synonyms) : undefined,
        year: anime.year ?? undefined,
        episodeCount: anime.episodeCount,
        status: anime.status,
        rating: anime.rating ?? undefined,
        genres,
        themes,
        externalIds,
        shikimoriData,
        restSource,
      })
      const animeInfoJson = JSON.stringify(animeInfo, null, 2)
      const animeInfoBuffer = Buffer.from(animeInfoJson, 'utf-8')
      // pin: false — animeInfoCid попадёт в directoryCid и будет защищён через indirect pin
      animeInfoCid = await addBytes(animeInfoBuffer, { pin: false })
      log.info('AnimeInfo опубликован', { animeId, animeInfoCid })
    }

    // Собираем эпизоды
    const episodes: AnimeManifestEpisode[] = anime.episodes
      .filter((ep) => ep.manifestCid || ep.transcodedCid) // Только эпизоды с контентом
      .map((ep) => ({
        number: ep.number,
        season: ep.season?.number ?? undefined,
        name: ep.name ?? undefined,
        manifestCid: ep.manifestCid ?? '',
        videoCid: ep.transcodedCid ?? undefined,
        size: ep.ipfsSize ?? 0,
        durationMs: ep.durationMs ?? undefined,
      }))

    // Получаем PeerId создателя
    let manifestCreatorPeerId = creatorPeerId
    if (!manifestCreatorPeerId) {
      const kuboService = getKuboService()
      if (kuboService.isRunning()) {
        manifestCreatorPeerId = kuboService.getPeerId() ?? undefined
      }
    }

    // Создаём EpisodesDocument и публикуем в IPFS
    const episodesDoc: EpisodesDocument = { version: 1, episodes }
    const episodesJson = JSON.stringify(episodesDoc, null, 2)
    // pin: false — попадёт в directoryCid через meta/episodes.json
    const episodesCid = await addBytes(Buffer.from(episodesJson, 'utf-8'), { pin: false })
    log.info('EpisodesDocument опубликован', { animeId, episodesCid, episodeCount: episodes.length })

    // === EpisodePreviewsDocument (превью для карточек + полноразмерные скриншоты) ===
    let episodePreviewsCid: string | undefined
    const previews: EpisodePreview[] = []
    for (const ep of anime.episodes) {
      const thumbs = ep.thumbnailCids ? (JSON.parse(ep.thumbnailCids) as string[]) : []
      const screens = ep.screenshotCids ? (JSON.parse(ep.screenshotCids) as string[]) : []
      if (thumbs.length > 0 || screens.length > 0) {
        previews.push({ number: ep.number, thumbnailCids: thumbs, screenshotCids: screens })
      }
    }
    if (previews.length > 0) {
      const previewsDoc: EpisodePreviewsDocument = { version: 1, previews }
      // pin: false — попадёт в directoryCid через meta/episode-previews.json
      episodePreviewsCid = await addBytes(Buffer.from(JSON.stringify(previewsDoc, null, 2), 'utf-8'), { pin: false })
      log.info('EpisodePreviewsDocument опубликован', { animeId, episodePreviewsCid, count: previews.length })
    }

    // === Генерируем FranchiseGraphDocument ===
    let franchiseGraphCid: string | undefined
    if (anime.shikimoriId) {
      try {
        // Проверяем есть ли уже graphCid у франшизы в БД
        const franchise = await prisma.franchise.findFirst({
          where: { animes: { some: { id: animeId } } },
          select: { id: true, graphCid: true },
        })

        if (franchise?.graphCid) {
          franchiseGraphCid = franchise.graphCid
          detail('info', `   ✓ franchise graph: из кеша`)
          log.info('FranchiseGraphDocument из БД', { franchiseGraphCid })
        } else {
          detail('info', `   ↻ Shikimori: граф франшизы…`)
          const apiGraph = await getFranchiseGraph(anime.shikimoriId)
          if (apiGraph && apiGraph.nodes.length > 0) {
            const rootShikimoriId = Math.min(...apiGraph.nodes.map((n) => n.id))
            const franchiseDoc: FranchiseGraphDocument = {
              version: 1,
              rootShikimoriId,
              name: apiGraph.nodes.find((n) => n.id === rootShikimoriId)?.name ?? anime.name,
              nodes: apiGraph.nodes.map((n) => ({
                id: n.id,
                name: n.name,
                kind: n.kind,
                year: n.year,
                image_url: n.image_url,
                url: n.url,
                weight: n.weight,
              })),
              links: apiGraph.links.map((l) => ({
                source_id: l.source_id,
                target_id: l.target_id,
                relation: l.relation,
                weight: l.weight,
              })),
            }

            // Публикуем в IPFS
            const franchiseJson = JSON.stringify(franchiseDoc, null, 2)
            // pin: false — попадёт в directoryCid через meta/franchise-graph.json
            franchiseGraphCid = await addBytes(Buffer.from(franchiseJson, 'utf-8'), { pin: false })
            log.info('FranchiseGraphDocument опубликован', { franchiseGraphCid, nodeCount: apiGraph.nodes.length })
            detail('info', `   ✓ franchise graph: ${apiGraph.nodes.length} аниме в серии`)

            // Обновляем graphCid у франшизы в БД
            const allNodeIds = apiGraph.nodes.map((n) => n.id)
            const upsertedFranchise = await prisma.franchise.upsert({
              where: { rootShikimoriId },
              update: { graphCid: franchiseGraphCid, graphUpdatedAt: new Date() },
              create: {
                id: `franchise-${rootShikimoriId}`,
                name: franchiseDoc.name,
                rootShikimoriId,
                graphCid: franchiseGraphCid,
                graphUpdatedAt: new Date(),
              },
            })

            // Привязываем аниме к франшизе (используем id из upsert, не хардкод)
            for (const nodeId of allNodeIds) {
              await prisma.anime.updateMany({
                where: { shikimoriId: nodeId, franchiseId: null },
                data: { franchiseId: upsertedFranchise.id },
              })
            }
          }
        }
      } catch (error) {
        log.warn('Не удалось создать FranchiseGraphDocument', {
          shikimoriId: anime.shikimoriId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Читаем старый манифест заранее — нужен для кеша relationsCid и сравнения контента
    let oldManifest: AnimeManifest | null = null
    if (anime.directoryCid) {
      try {
        const oldBuf = await cat(`${anime.directoryCid}/manifest.json`)
        oldManifest = JSON.parse(oldBuf.toString('utf-8'))
      } catch {
        // Старый манифест недоступен — генерируем новый
      }
    }

    // === Генерируем RelationsDocument ===
    // При skipShikimoriRefresh — берём relationsCid из старого манифеста (если есть)
    // чтобы не делать лишний Shikimori API запрос на каждое аниме при batch-регенерации
    let relationsCid: string | undefined
    if (canSkipShikimori && oldManifest?.relationsCid) {
      relationsCid = oldManifest.relationsCid
      log.info('RelationsDocument из кеша манифеста', { animeId, relationsCid })
    } else if (anime.shikimoriId) {
      try {
        detail('info', `   ↻ Shikimori: связанные произведения…`)
        const relatedData = await getAnimeWithRelated(anime.shikimoriId)
        if (relatedData && relatedData.related.length > 0) {
          const relations: AnimeManifestRelation[] = relatedData.related
            .filter((r) => r.anime != null)
            .map((r) => ({
              targetShikimoriId: Number(r.anime!.id),
              relationKind: r.relationKind,
              targetName: r.anime!.russian ?? r.anime!.name,
              targetYear: r.anime!.airedOn?.year ?? undefined,
              targetKind: r.anime!.kind ?? undefined,
              targetPosterUrl: r.anime!.poster?.mainUrl ?? undefined,
            }))

          if (relations.length > 0) {
            // Сортируем по targetShikimoriId для детерминированного JSON (порядок из API может меняться)
            const sortedRelations = [...relations].sort((a, b) => a.targetShikimoriId - b.targetShikimoriId)
            const relationsDoc: RelationsDocument = { version: 1, relations: sortedRelations }
            const relationsJson = JSON.stringify(relationsDoc, null, 2)
            // pin: false — попадёт в directoryCid через meta/relations.json
            relationsCid = await addBytes(Buffer.from(relationsJson, 'utf-8'), { pin: false })
            log.info('RelationsDocument опубликован', { relationsCid, relationCount: relations.length })
            detail('info', `   ✓ связанные: ${relations.length} произведений`)

            // Обновляем AnimeRelation записи в БД (только индексные поля)
            await upsertAnimeRelations(prisma, animeId, relations)
          }
        }
      } catch (error) {
        log.warn('Не удалось создать RelationsDocument', {
          shikimoriId: anime.shikimoriId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Собираем манифест (только данные раздачи, метаданные — в AnimeInfo)
    const now = new Date().toISOString()
    const manifest: AnimeManifest = {
      version: 1 as typeof ANIME_MANIFEST_VERSION,
      animeInfoCid,
      name: anime.name,
      episodesCid,
      posterCid: anime.posterCid ?? anime.poster?.cid ?? undefined,
      franchiseGraphCid,
      relationsCid,
      episodePreviewsCid,
      isBdRemux: anime.isBdRemux || undefined,
      sourceUrl: anime.rutrackerUrl || undefined,
      creatorPeerId: manifestCreatorPeerId,
      createdAt: now,
      updatedAt: now,
    }

    if (oldManifest) {
      // Сохраняем createdAt из старого манифеста
      manifest.createdAt = oldManifest.createdAt

      // Сравниваем контентные поля (без временных меток и directory stats)
      const contentEqual =
        manifest.animeInfoCid === oldManifest.animeInfoCid &&
        manifest.name === oldManifest.name &&
        manifest.episodesCid === oldManifest.episodesCid &&
        manifest.posterCid === oldManifest.posterCid &&
        manifest.franchiseGraphCid === oldManifest.franchiseGraphCid &&
        manifest.relationsCid === oldManifest.relationsCid &&
        manifest.episodePreviewsCid === oldManifest.episodePreviewsCid &&
        manifest.isBdRemux === oldManifest.isBdRemux &&
        manifest.sourceUrl === (oldManifest as Record<string, unknown>).sourceUrl &&
        manifest.creatorPeerId === oldManifest.creatorPeerId

      if (contentEqual && !forceUpdatedAt) {
        // Ничего не изменилось — возвращаем сигнал без нового CID
        manifest.updatedAt = oldManifest.updatedAt
        log.info('AnimeManifest без изменений, пропускаем', { animeId })

        // Подстраховка: убеждаемся что суб-документы recursive-pinned
        // (direct pins от addBytes могут теряться)
        await pinSubDocuments([
          ['animeInfoCid', animeInfoCid],
          ['episodesCid', episodesCid],
          ['episodePreviewsCid', episodePreviewsCid],
          ['franchiseGraphCid', franchiseGraphCid],
          ['relationsCid', relationsCid],
        ])

        return { success: true, unchanged: true, manifest }
      }

      // Есть изменения или принудительное обновление — обновляем updatedAt
      manifest.updatedAt = now
    }

    // Публикуем в IPFS
    const manifestJson = JSON.stringify(manifest, null, 2)
    const manifestBuffer = Buffer.from(manifestJson, 'utf-8')
    // pin: false — manifestCid попадёт в directoryCid как manifest.json и будет indirect.
    // Defense-in-depth: pinSubDocuments ниже всё равно поставит recursive pin для контентEqual ветки;
    // здесь — нет, потому что follow-up build directoryCid сам пинит и защищает.
    const manifestCid = await addBytes(manifestBuffer, { pin: false })

    log.info('AnimeManifest опубликован', {
      animeId,
      animeName: anime.name,
      manifestCid,
      animeInfoCid,
      episodeCount: episodes.length,
    })

    // Явный pin не нужен: суб-документы добавлены с pin:false и попадут indirect под directoryCid.
    // Caller (updateAnimeManifest) вызывает анимный directory builder сразу после, и он пинит
    // только корневой directoryCid — все суб-документы получают защиту от GC через indirect pin.

    return {
      success: true,
      manifestCid,
      manifest,
      ageRating: animeInfo?.ageRating,
    }
  } catch (error) {
    log.error('Ошибка генерации AnimeManifest', {
      animeId,
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Обновить манифест аниме и сохранить CID в БД
 *
 * @param animeId - ID аниме
 * @returns Результат с новым CID
 */
export async function updateAnimeManifest(
  animeId: string,
  options?: { skipShikimoriRefresh?: boolean }
): Promise<
  GenerateAnimeManifestResult & {
    directoryError?: string
    contentHealth?: 'complete' | 'degraded' | 'broken'
    missingCidsCount?: number
    missingFontsCount?: number
    recoveredCount?: number
  }
> {
  const result = await generateAnimeManifest({ animeId, skipShikimoriRefresh: options?.skipShikimoriRefresh })

  // unchanged не возвращает manifestCid — проверяем отдельно до основного блока
  if (result.success && result.unchanged) {
    log.info('Манифест без изменений — запускаем health check образов', { animeId })

    // Запускаем buildAnimeDirectory для проверки и восстановления недоступных CID образов
    let recovered: import('./ipfs/anime-directory-builder').RecoveredCidEntry[] = []
    try {
      const { buildAnimeDirectory } = await import('./ipfs/anime-directory-builder')
      const healthCheck = await buildAnimeDirectory(animeId)
      recovered = healthCheck.recovered
      if (recovered.length > 0) {
        log.info('Health check восстановил образы, перегенерируем манифест', {
          animeId,
          recoveredCount: recovered.length,
        })
      }
    } catch (error) {
      log.warn('Health check директории не удался', { animeId, error: String(error) })
    }

    if (recovered.length === 0) {
      // Контент без изменений, образы в порядке — помечаем как проверенное
      await prisma.anime.update({
        where: { id: animeId },
        data: { lastHealthCheckAt: new Date() },
      })
      return { ...result, recoveredCount: 0 }
    }

    // Образы восстановлены → DB обновлена новыми CID → перегенерируем манифест с принудительным updatedAt
    const retryResult = await generateAnimeManifest({
      animeId,
      skipShikimoriRefresh: options?.skipShikimoriRefresh,
      forceUpdatedAt: true,
    })

    if (!retryResult.success || !retryResult.manifestCid) {
      // Перегенерация не изменила манифест или завершилась с ошибкой
      await prisma.anime.update({
        where: { id: animeId },
        data: { lastHealthCheckAt: new Date() },
      })
      return { ...result, recoveredCount: recovered.length }
    }

    // Есть новый manifestCid — обновляем animeInfoCid в БД
    await prisma.anime.update({
      where: { id: animeId },
      data: {
        animeInfoCid: retryResult.manifest?.animeInfoCid ?? undefined,
        ...(retryResult.ageRating && { ageRating: retryResult.ageRating }),
      },
    })

    // Запоминаем старый directoryCid ДО пересборки — открепим ПОСЛЕ того как новый запинен
    const oldAnime = await prisma.anime.findUnique({ where: { id: animeId }, select: { directoryCid: true } })

    // Собираем обновлённую директорию с новым манифестом.
    // НЕ открепляем старый directoryCid до этого момента — иначе дочерние CID
    // (episode manifests, thumbnails-img) теряют защиту от GC до пина нового.
    const { buildAnimeDirectory: rebuildDirectory } = await import('./ipfs/anime-directory-builder')
    const buildResult = await rebuildDirectory(animeId, { manifestCidOverride: retryResult.manifestCid })
    const { directoryCid, totalBlocks, totalSize, missingCids, missingFonts } = buildResult

    const hasCriticalLoss2 = missingCids.some((m) => m.kind === 'video' || m.kind === 'audio' || m.kind === 'sub')
    const hasAnyLoss2 = missingCids.length > 0 || missingFonts.length > 0
    const contentHealth2: 'complete' | 'degraded' | 'broken' = hasCriticalLoss2
      ? 'broken'
      : hasAnyLoss2
        ? 'degraded'
        : 'complete'

    // Сохраняем новый directoryCid — теперь контент защищён через новый пин
    await prisma.anime.update({
      where: { id: animeId },
      data: {
        directoryCid,
        directoryBlocks: totalBlocks,
        directorySize: totalSize,
        contentHealth: contentHealth2,
        missingCidsJson: missingCids.length > 0 ? JSON.stringify(missingCids) : null,
        missingFontsJson: missingFonts.length > 0 ? JSON.stringify(missingFonts) : null,
        lastHealthCheckAt: new Date(),
      },
    })

    // Теперь безопасно открепить старый directoryCid — новый уже закреплён
    if (oldAnime?.directoryCid && oldAnime.directoryCid !== directoryCid) {
      try {
        const { CID } = await import('multiformats/cid')
        const client = getKuboService().getClientOrNull()
        if (client) {
          await client.pin.rm(CID.parse(oldAnime.directoryCid))
        }
      } catch (error) {
        log.debug('Не удалось открепить старый directoryCid', { error: String(error) })
      }
    }

    log.info('Директория пересобрана после восстановления образов', {
      animeId,
      directoryCid,
      recoveredCount: recovered.length,
      contentHealth: contentHealth2,
    })

    return {
      ...retryResult,
      contentHealth: contentHealth2,
      missingCidsCount: missingCids.length,
      missingFontsCount: missingFonts.length,
      recoveredCount: recovered.length,
    }
  }

  if (result.success && result.manifestCid) {
    // Сохраняем AnimeInfo и ageRating в БД (manifestCid не хранится отдельно — он внутри directoryCid)
    await prisma.anime.update({
      where: { id: animeId },
      data: {
        animeInfoCid: result.manifest?.animeInfoCid ?? undefined,
        ...(result.ageRating && { ageRating: result.ageRating }),
      },
    })

    log.info('AnimeInfo сохранён в БД', { animeId, animeInfoCid: result.manifest?.animeInfoCid })

    // Запоминаем старый directoryCid ДО сборки — открепим ПОСЛЕ пина нового.
    // НЕ снимаем пин заранее: иначе дочерние CID (thumbnails-img, episode manifests)
    // теряют защиту от GC в окне между unpin старого и pin нового directoryCid.
    const oldAnime = await prisma.anime.findUnique({
      where: { id: animeId },
      select: { directoryCid: true },
    })

    // Строим IPFS-директорию аниме (один CID = весь контент) с retry
    const MAX_RETRIES = 2
    let lastError: Error | null = null
    // Hoisted из цикла — чтобы вернуть в caller (для UI-отчёта в regenerateAll)
    let buildContentHealth: 'complete' | 'degraded' | 'broken' | undefined
    let buildMissingCidsCount = 0
    let buildMissingFontsCount = 0
    let buildRecoveredCount = 0

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const { buildAnimeDirectory } = await import('./ipfs/anime-directory-builder')
        const buildResult = await buildAnimeDirectory(animeId, { manifestCidOverride: result.manifestCid })
        const { directoryCid, episodeCount, totalBlocks, totalSize, missingCids, missingFonts, recovered } = buildResult

        // Вычисляем contentHealth — broken если потеряны video/audio/sub, иначе degraded
        const hasCriticalLoss = missingCids.some((m) => m.kind === 'video' || m.kind === 'audio' || m.kind === 'sub')
        const hasAnyLoss = missingCids.length > 0 || missingFonts.length > 0
        const contentHealth: 'complete' | 'degraded' | 'broken' = hasCriticalLoss
          ? 'broken'
          : hasAnyLoss
            ? 'degraded'
            : 'complete'

        buildContentHealth = contentHealth
        buildMissingCidsCount = missingCids.length
        buildMissingFontsCount = missingFonts.length
        buildRecoveredCount = recovered.length

        await prisma.anime.update({
          where: { id: animeId },
          data: {
            directoryCid,
            directoryBlocks: totalBlocks,
            directorySize: totalSize,
            contentHealth,
            missingCidsJson: missingCids.length > 0 ? JSON.stringify(missingCids) : null,
            missingFontsJson: missingFonts.length > 0 ? JSON.stringify(missingFonts) : null,
            lastHealthCheckAt: new Date(),
          },
        })

        log.info('directoryCid сохранён в БД', {
          animeId,
          directoryCid,
          episodeCount,
          totalBlocks,
          totalSize,
          contentHealth,
          missingCidsCount: missingCids.length,
          missingFontsCount: missingFonts.length,
          recoveredCount: recovered.length,
        })

        // Открепляем старый directoryCid только ПОСЛЕ того как новый закреплён и сохранён
        if (oldAnime?.directoryCid && oldAnime.directoryCid !== directoryCid) {
          try {
            const { CID } = await import('multiformats/cid')
            const client = getKuboService().getClientOrNull()
            if (client) {
              await client.pin.rm(CID.parse(oldAnime.directoryCid))
              log.info('Старый directoryCid откреплён', { directoryCid: oldAnime.directoryCid })
            }
          } catch (error) {
            log.debug('Не удалось открепить старый directoryCid', { error: String(error) })
          }
        }

        lastError = null
        break
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < MAX_RETRIES) {
          log.warn(`Попытка ${attempt}/${MAX_RETRIES} построить IPFS-директорию не удалась, повтор через 2 сек`, {
            animeId,
            error: lastError.message,
          })
          await new Promise((resolve) => setTimeout(resolve, 2000))
        }
      }
    }

    if (lastError) {
      const errorMsg = lastError.message
      log.error('Не удалось создать IPFS-директорию после всех попыток', { animeId, error: errorMsg })

      // Уведомляем renderer о провале сборки директории
      try {
        const { broadcastToWindows } = await import('../utils/ipc-handler-factory')
        broadcastToWindows('anime:directoryBuildFailed', { animeId, error: errorMsg })
      } catch {
        // Broadcast опционален
      }

      // Манифест опубликован, но директория не собралась — всё равно ставим отметку,
      // чтобы аниме не появлялось снова при resume регенерации
      await prisma.anime.update({
        where: { id: animeId },
        data: { lastHealthCheckAt: new Date() },
      })

      return {
        ...result,
        directoryError: errorMsg,
        contentHealth: buildContentHealth,
        missingCidsCount: buildMissingCidsCount,
        missingFontsCount: buildMissingFontsCount,
        recoveredCount: buildRecoveredCount,
      }
    }

    return {
      ...result,
      contentHealth: buildContentHealth,
      missingCidsCount: buildMissingCidsCount,
      missingFontsCount: buildMissingFontsCount,
      recoveredCount: buildRecoveredCount,
    }
  }

  return result
}
