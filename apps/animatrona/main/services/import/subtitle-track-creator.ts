/**
 * Создание субтитров для эпизодов
 * Портировано из renderer — mutations и uploadToIpfs заменены на import-db и import-ipfs
 */

import fs from 'fs'
import path from 'path'

import type { DemuxedSubtitle, DemuxResult } from '../../../shared/types'
import * as db from './import-db'
import { uploadToIpfs } from './import-ipfs'

/** Рекомендация субтитров */
interface SubtitleRecommendation {
  enabled: boolean
  isExternal?: boolean
  externalPath?: string
  language?: string
  title?: string
  format: string
  streamIndex?: number
  matchedFonts?: Array<{ name: string; path: string }>
  dubGroup?: string
  subtitleType?: string
}

/** Внешний субтитр (из сканера) */
interface ExternalSubtitleMatch {
  filePath: string
  episodeNumber: number | null
  language: string
  format: string
  title?: string
  matchedFonts?: Array<{ name: string; path: string }>
}

/** Анализ файла */
interface FileAnalysisLike {
  episodeNumber: number
  subtitleRecommendations: SubtitleRecommendation[]
}

/**
 * Создаёт субтитры из demux результата и внешних файлов
 */
export async function createSubtitleTracks(
  episodeId: string,
  demuxResult: DemuxResult,
  fileAnalyses: FileAnalysisLike[] | undefined,
  episodeNumber: number,
  episodeOutputDir: string,
  externalSubsMap: Map<number, ExternalSubtitleMatch[]>
): Promise<void> {
  const fileAnalysis = fileAnalyses?.find((a) => a.episodeNumber === episodeNumber)
  const selectedSubs = fileAnalysis?.subtitleRecommendations.filter((r) => r.enabled) || []

  if (selectedSubs.length > 0) {
    await processSelectedSubtitles(episodeId, demuxResult, selectedSubs, episodeOutputDir)
  } else {
    await processEmbeddedSubtitles(episodeId, demuxResult)
    await processExternalSubtitles(episodeId, episodeNumber, episodeOutputDir, externalSubsMap)
  }
}

/** Обработка выбранных субтитров из fileAnalysis */
async function processSelectedSubtitles(
  episodeId: string,
  demuxResult: DemuxResult,
  selectedSubs: SubtitleRecommendation[],
  episodeOutputDir: string
): Promise<void> {
  let isFirstSub = true

  for (const rec of selectedSubs) {
    try {
      if (rec.isExternal && rec.externalPath) {
        await processExternalSubtitle(episodeId, rec, episodeOutputDir, isFirstSub)
      } else {
        const embeddedTrack = demuxResult.subtitles?.find((s: DemuxedSubtitle) => s.index === rec.streamIndex)
        if (embeddedTrack) {
          const subUploadResult = await uploadToIpfs(embeddedTrack.path)

          await db.createSubtitleTrack({
            episodeId,
            streamIndex: embeddedTrack.index,
            language: rec.language || embeddedTrack.language || 'und',
            title: embeddedTrack.title || undefined,
            format: embeddedTrack.format,
            isDefault: isFirstSub,
            fileCid: subUploadResult?.cid ?? undefined,
            ipfsSize: subUploadResult?.size ?? undefined,
            dubGroup: rec.dubGroup || undefined,
            subtitleType: rec.subtitleType || 'full',
          })

          // Удаляем локальный файл после загрузки в IPFS
          if (subUploadResult) {
            try {
              fs.unlinkSync(embeddedTrack.path)
            } catch {
              /* ignore */
            }
          }
        }
      }
      isFirstSub = false
    } catch (subError) {
      console.warn(`[SubtitleTrackCreator] Failed to process subtitle:`, subError)
    }
  }
}

/** Обработка внешнего субтитра */
async function processExternalSubtitle(
  episodeId: string,
  rec: SubtitleRecommendation,
  episodeOutputDir: string,
  isDefault: boolean
): Promise<void> {
  const extPath = rec.externalPath
  if (!extPath) {
    return
  }

  const subFileName = extPath.split(/[/\\]/).pop() || `external_${rec.language}.${rec.format}`
  const destSubPath = path.join(episodeOutputDir, subFileName)
  fs.copyFileSync(extPath, destSubPath)

  const extSubUploadResult = await uploadToIpfs(destSubPath)

  const subtitleTrack = await db.createSubtitleTrack({
    episodeId,
    streamIndex: -1,
    language: rec.language || 'und',
    title: rec.title || undefined,
    format: rec.format,
    isDefault,
    fileCid: extSubUploadResult?.cid ?? undefined,
    ipfsSize: extSubUploadResult?.size ?? undefined,
    dubGroup: rec.dubGroup || undefined,
    subtitleType: rec.subtitleType || 'full',
  })

  // Удаляем локальный файл после загрузки в IPFS
  if (extSubUploadResult) {
    try {
      fs.unlinkSync(destSubPath)
    } catch {
      /* ignore */
    }
  }

  // Копируем и загружаем шрифты
  if (rec.matchedFonts && rec.matchedFonts.length > 0) {
    await processFonts(subtitleTrack.id, rec.matchedFonts, episodeOutputDir)
  }
}

/** Обработка встроенных субтитров */
async function processEmbeddedSubtitles(episodeId: string, demuxResult: DemuxResult): Promise<void> {
  if (!demuxResult.subtitles || demuxResult.subtitles.length === 0) {
    return
  }

  await Promise.all(
    demuxResult.subtitles.map(async (track: DemuxedSubtitle, idx: number) => {
      const embSubResult = await uploadToIpfs(track.path)

      return db.createSubtitleTrack({
        episodeId,
        streamIndex: track.index,
        language: track.language || 'und',
        title: track.title || undefined,
        format: track.format,
        isDefault: idx === 0,
        fileCid: embSubResult?.cid ?? undefined,
        ipfsSize: embSubResult?.size ?? undefined,
      })
    })
  )
}

/** Обработка внешних субтитров из externalSubsMap */
async function processExternalSubtitles(
  episodeId: string,
  episodeNumber: number,
  episodeOutputDir: string,
  externalSubsMap: Map<number, ExternalSubtitleMatch[]>
): Promise<void> {
  const extSubs = externalSubsMap.get(episodeNumber) || []

  for (const extSub of extSubs) {
    try {
      const subFileName = extSub.filePath.split(/[/\\]/).pop() || `external_${extSub.language}.${extSub.format}`
      const destSubPath = path.join(episodeOutputDir, subFileName)
      fs.copyFileSync(extSub.filePath, destSubPath)

      const extSubResult = await uploadToIpfs(destSubPath)

      const subtitleTrack = await db.createSubtitleTrack({
        episodeId,
        streamIndex: -1,
        language: extSub.language || 'und',
        title: extSub.title || undefined,
        format: extSub.format,
        isDefault: false,
        fileCid: extSubResult?.cid ?? undefined,
        ipfsSize: extSubResult?.size ?? undefined,
      })

      if (extSubResult) {
        try {
          fs.unlinkSync(destSubPath)
        } catch {
          /* ignore */
        }
      }

      if (extSub.matchedFonts && extSub.matchedFonts.length > 0) {
        await processFonts(subtitleTrack.id, extSub.matchedFonts, episodeOutputDir)
      }
    } catch (extSubError) {
      console.warn(`[SubtitleTrackCreator] Failed to process external subtitle:`, extSubError)
    }
  }
}

/** Обработка шрифтов для субтитров */
async function processFonts(
  subtitleTrackId: string,
  matchedFonts: Array<{ name: string; path: string }>,
  episodeOutputDir: string
): Promise<void> {
  const fontsDir = path.join(episodeOutputDir, 'fonts')
  if (!fs.existsSync(fontsDir)) {
    fs.mkdirSync(fontsDir, { recursive: true })
  }

  for (const font of matchedFonts) {
    try {
      const fontFileName = font.path.split(/[/\\]/).pop() || `${font.name}.ttf`
      const destFontPath = path.join(fontsDir, fontFileName)
      fs.copyFileSync(font.path, destFontPath)

      const fileExt = fontFileName.split('.').pop()?.toLowerCase() || 'ttf'
      const fontUploadResult = await uploadToIpfs(destFontPath)

      await db.createSubtitleFont({
        subtitleTrackId,
        fontName: font.name,
        fileExt,
        fileCid: fontUploadResult?.cid ?? undefined,
        ipfsSize: fontUploadResult?.size ?? undefined,
      })

      if (fontUploadResult) {
        try {
          fs.unlinkSync(destFontPath)
        } catch {
          /* ignore */
        }
      }
    } catch (fontError) {
      console.warn(`[SubtitleTrackCreator] Failed to copy font ${font.name}:`, fontError)
    }
  }
}
