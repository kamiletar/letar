/**
 * Пост-обработка эпизодов после транскодирования: скриншоты, превью-спрайт,
 * манифест эпизода, загрузка видео/манифеста в IPFS, обновление Episode в БД.
 *
 * Выделено из ImportService.runPostProcess — раньше опиралось на `this`
 * (emitProgress/videoEncodingMeta/createdAnimeFolder), теперь принимает контекст явно.
 */

import fs from 'fs'

import { generateScreenshots, generateThumbnailSprite } from '../../ffmpeg/screenshot'
import { createModuleLogger } from '../../utils/logger'
import {
  generateManifestFromDemux,
  rebuildManifestTracksFromFile,
  updateManifestEncoding,
  updateManifestMediaCids,
  updateManifestThumbnails,
} from '../manifest-generator'
import * as db from './import-db'
import { uploadToIpfs } from './import-ipfs'
import type { PostProcessData, VideoEncodingMeta } from './types'

const log = createModuleLogger('ImportService')

export interface PostProcessRunnerContext {
  emitProgress: (progress: number, fileName?: string, stage?: string) => void
  videoEncodingMeta: Map<string, VideoEncodingMeta>
  createdAnimeFolder: string | null
}

export async function runPostProcess(
  postProcessDataMap: Map<string, PostProcessData>,
  ctx: PostProcessRunnerContext,
): Promise<{ failedEpisodes: Array<{ number: number; error: string }> }> {
  const episodes = Array.from(postProcessDataMap.values())
  const totalEpisodes = episodes.length
  const failedEpisodes: Array<{ number: number; error: string }> = []

  for (let i = 0; i < episodes.length; i++) {
    const data = episodes[i]

    const epLabel = `${i + 1}/${totalEpisodes} — Серия ${data.episodeNumber}`
    ctx.emitProgress(91 + (i / totalEpisodes) * 4, `${epLabel}: скриншоты...`, 'postprocess_screenshots')

    try {
      let thumbnailCidsJson: string | undefined
      let screenshotCidsJson: string | undefined

      // Скриншоты
      if (data.duration > 0) {
        try {
          const screenshotResult = await generateScreenshots(data.sourcePath, data.outputDir, data.duration, {
            count: 5,
            format: 'webp',
            thumbnailWidth: 320,
            fullWidth: 1280,
            quality: 80,
          })

          if (screenshotResult.thumbnails?.length) {
            const thumbnailResults = await Promise.all(
              screenshotResult.thumbnails.map((p: string) => uploadToIpfs(p)),
            )
            const validThumbnailCids = thumbnailResults
              .filter((r): r is NonNullable<typeof r> => r !== null)
              .map((r) => r.cid)
            if (validThumbnailCids.length > 0) {
              thumbnailCidsJson = JSON.stringify(validThumbnailCids)
              for (const thumbPath of screenshotResult.thumbnails) {
                try {
                  fs.unlinkSync(thumbPath)
                } catch {
                  /* ignore */
                }
              }
            }

            if (screenshotResult.fullSize?.length) {
              const screenshotResults = await Promise.all(
                screenshotResult.fullSize.map((p: string) => uploadToIpfs(p)),
              )
              const validScreenshotCids = screenshotResults
                .filter((r): r is NonNullable<typeof r> => r !== null)
                .map((r) => r.cid)
              if (validScreenshotCids.length > 0) {
                screenshotCidsJson = JSON.stringify(validScreenshotCids)
                for (const ssPath of screenshotResult.fullSize) {
                  try {
                    fs.unlinkSync(ssPath)
                  } catch {
                    /* ignore */
                  }
                }
              }
            }
          }
        } catch (e) {
          log.warn(`Не удалось создать скриншоты`, { episode: data.episodeNumber, error: String(e) })
        }
      }

      // Thumbnail sprite
      ctx.emitProgress(91 + (i / totalEpisodes) * 4, `${epLabel}: превью-спрайт...`, 'postprocess_sprite')
      let spriteData: { vttCid: string; spriteCid: string } | undefined
      if (data.duration > 0) {
        try {
          const spriteResult = await generateThumbnailSprite(data.sourcePath, data.outputDir, data.duration, {
            frameCount: 100,
            frameWidth: 160,
            frameHeight: 90,
            columns: 10,
            quality: 75,
          })

          if (spriteResult.spritePath && spriteResult.vttPath) {
            const [vttResult, spriteUploadResult] = await Promise.all([
              uploadToIpfs(spriteResult.vttPath),
              uploadToIpfs(spriteResult.spritePath),
            ])
            if (vttResult?.cid && spriteUploadResult?.cid) {
              spriteData = { vttCid: vttResult.cid, spriteCid: spriteUploadResult.cid }
              try {
                fs.unlinkSync(spriteResult.vttPath)
                fs.unlinkSync(spriteResult.spritePath)
              } catch {
                /* ignore */
              }
            }
          }
        } catch (e) {
          log.warn(`Не удалось создать sprite`, { episode: data.episodeNumber, error: String(e) })
        }
      }

      // Манифест
      ctx.emitProgress(92 + (i / totalEpisodes) * 4, `${epLabel}: манифест...`, 'postprocess_manifest')

      const manifestPath = `${data.outputDir}/manifest.json`
      await generateManifestFromDemux(data.demuxResult, {
        episodeId: data.episodeId,
        videoPath: data.sourcePath,
        outputDir: data.outputDir,
        animeInfo: {
          animeName: data.animeName,
          seasonNumber: data.seasonNumber,
          episodeNumber: data.episodeNumber,
        },
        audioTrackOverrides: data.audioTrackOverrides,
        subtitleTrackOverrides: data.subtitleTrackOverrides,
      })

      if (spriteData) {
        try {
          await updateManifestThumbnails(manifestPath, spriteData)
        } catch (err) {
          log.warn(
            'Не удалось записать превью-спрайт в манифест — sprite/vtt CID уже в IPFS, но манифест их не содержит',
            {
              episodeId: data.episodeId,
              episodeNumber: data.episodeNumber,
              spriteData,
              error: String(err),
            },
          )
        }
      }

      // Encoding info
      if (data.videoOptions) {
        try {
          const encodingMeta = ctx.videoEncodingMeta.get(data.episodeId)
          const sourceSizeNum = data.demuxResult.video?.size
            ?? (data.demuxResult.video?.bitrate && data.demuxResult.video?.duration
              ? Math.round((data.demuxResult.video.bitrate * data.demuxResult.video.duration) / 8)
              : undefined)
          let transcodedSizeNum: number | undefined
          try {
            const stats = fs.statSync(data.videoOutputPath)
            transcodedSizeNum = stats.size
          } catch (err) {
            log.warn(
              'Не удалось получить размер транскодированного видео — compressionRatio в манифесте не будет посчитан',
              {
                episodeId: data.episodeId,
                episodeNumber: data.episodeNumber,
                error: String(err),
              },
            )
          }

          await updateManifestEncoding(manifestPath, {
            profileName: data.encodingProfileName ?? 'default',
            codec: data.videoOptions.codec,
            cq: data.videoOptions.cq,
            preset: data.videoOptions.preset,
            rateControl: data.videoOptions.rateControl,
            spatialAq: data.videoOptions.spatialAq,
            temporalAq: data.videoOptions.temporalAq,
            aqStrength: data.videoOptions.aqStrength,
            force10Bit: data.videoOptions.force10Bit,
            vmafScore: data.vmafScore,
            encoderType: data.encoderType ?? 'gpu',
            ffmpegCommand: encodingMeta?.ffmpegCommand,
            transcodeDurationMs: encodingMeta?.transcodeDurationMs,
            activeGpuWorkers: encodingMeta?.activeGpuWorkers,
            sourceSize: sourceSizeNum,
            transcodedSize: transcodedSizeNum,
            compressionRatio: sourceSizeNum && transcodedSizeNum ? transcodedSizeNum / sourceSizeNum : undefined,
            sourceCodec: data.demuxResult.video?.codec,
            sourceWidth: data.demuxResult.video?.width,
            sourceHeight: data.demuxResult.video?.height,
            sourceBitrate: data.demuxResult.video?.bitrate,
            sourceBitDepth: data.demuxResult.video?.bitDepth,
          })
        } catch (err) {
          log.warn('Не удалось записать encoding info в манифест эпизода', {
            episodeId: data.episodeId,
            episodeNumber: data.episodeNumber,
            error: String(err),
          })
        }
      }

      // Загружаем видео в IPFS
      ctx.emitProgress(
        93 + (i / totalEpisodes) * 4,
        `${epLabel}: загрузка видео в IPFS...`,
        'postprocess_ipfs_video',
      )
      const videoUploadResult = await uploadToIpfs(data.videoOutputPath)
      const transcodedCid = videoUploadResult?.cid
      const videoIpfsSize = videoUploadResult?.size
      if (!transcodedCid) {
        throw new Error(`Не удалось загрузить video.webm в IPFS: ${data.videoOutputPath}`)
      }
      if (transcodedCid) {
        try {
          fs.unlinkSync(data.videoOutputPath)
        } catch {
          /* ignore */
        }
      }

      // Обновляем манифест с CID'ами
      try {
        const dbAudioTracks = await db.findManyAudioTracks(data.episodeId)
        const dbSubtitleTracks = await db.findManySubtitleTracks(data.episodeId)

        const audioTrackCids: Record<string, string> = {}
        const audioTrackCodecs: Record<string, string> = {}
        const audioTrackChannels: Record<string, string> = {}
        const sizes: Record<string, number> = {}

        if (transcodedCid && videoIpfsSize) {
          sizes[transcodedCid] = videoIpfsSize
        }

        for (const t of dbAudioTracks) {
          const trackId = `audio-${t.streamIndex}`
          if (t.transcodedCid) {
            audioTrackCids[trackId] = t.transcodedCid
            if (t.ipfsSize) {
              sizes[t.transcodedCid] = t.ipfsSize
            }
          }
          if (t.codec) {
            audioTrackCodecs[trackId] = t.codec
          }
          if (t.channels) {
            audioTrackChannels[trackId] = t.channels
          }
        }

        const subtitleTrackCids: Record<string, string> = {}
        for (const t of dbSubtitleTracks) {
          if (t.fileCid) {
            subtitleTrackCids[`sub-${t.streamIndex}`] = t.fileCid
            if (t.ipfsSize) {
              sizes[t.fileCid] = t.ipfsSize
            }
          }
        }

        await updateManifestMediaCids(manifestPath, {
          videoCid: transcodedCid ?? undefined,
          audioTrackCids,
          audioTrackCodecs,
          audioTrackChannels,
          subtitleTrackCids,
          sizes,
        })
      } catch (err) {
        log.warn(
          'Не удалось записать CID медиа (видео/аудио/субтитры) в манифест эпизода — манифест останется без ссылок на IPFS-контент',
          {
            episodeId: data.episodeId,
            episodeNumber: data.episodeNumber,
            error: String(err),
          },
        )
      }

      // Rebuild tracks из БД (полные данные для манифеста)
      try {
        const audioForManifest = await db.findAudioTracksForManifest(data.episodeId)
        const subsForManifest = await db.findSubtitleTracksForManifest(data.episodeId)
        rebuildManifestTracksFromFile(manifestPath, audioForManifest, subsForManifest)
      } catch (err) {
        log.warn(
          'Не удалось перестроить дорожки манифеста из БД — манифест может содержать неполный список аудио/субтитров',
          {
            episodeId: data.episodeId,
            episodeNumber: data.episodeNumber,
            error: String(err),
          },
        )
      }

      // Metadata JSON
      const metadataJsonPath = data.demuxResult.metadata?.path
      let metadataCid: string | undefined
      if (metadataJsonPath) {
        metadataCid = (await uploadToIpfs(metadataJsonPath))?.cid ?? undefined
        if (metadataCid) {
          try {
            await updateManifestMediaCids(manifestPath, { metadataCid })
          } catch (err) {
            log.warn('Не удалось записать metadataCid в манифест эпизода', {
              episodeId: data.episodeId,
              episodeNumber: data.episodeNumber,
              metadataCid,
              error: String(err),
            })
          }
          try {
            fs.unlinkSync(metadataJsonPath)
          } catch {
            /* ignore */
          }
        }
      }

      // Загружаем манифест в IPFS
      ctx.emitProgress(94 + (i / totalEpisodes) * 4, `${epLabel}: публикация манифеста...`, 'postprocess_publish')
      const manifestUploadResult = await uploadToIpfs(manifestPath)
      const manifestCid = manifestUploadResult?.cid
      if (manifestCid) {
        try {
          fs.unlinkSync(manifestPath)
        } catch {
          /* ignore */
        }
      }

      // Обновляем Episode
      await db.updateEpisode(data.episodeId, {
        transcodedCid: transcodedCid ?? undefined,
        ipfsSize: videoIpfsSize ?? undefined,
        manifestCid: manifestCid ?? undefined,
        thumbnailCids: thumbnailCidsJson,
        screenshotCids: screenshotCidsJson,
        metadataCid: metadataCid ?? undefined,
        // Проверяем существование профиля (мог быть удалён re-seedом во время транскодирования)
        encodingProfileId: data.encodingProfileId
          ? ((await db.findEncodingProfile(data.encodingProfileId))?.id ?? null)
          : undefined,
      })

      // Удаляем папку эпизода
      try {
        fs.rmSync(data.outputDir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }

      log.info(`Episode ${data.episodeNumber} completed`)
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e)
      log.error(`Ошибка пост-обработки episode ${data.episodeNumber}`, { error: errorMsg })
      failedEpisodes.push({ number: data.episodeNumber, error: errorMsg })
    }
  }

  // Удаляем корневую папку аниме
  if (ctx.createdAnimeFolder) {
    try {
      fs.rmSync(ctx.createdAnimeFolder, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }

  return { failedEpisodes }
}
