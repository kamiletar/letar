/**
 * Анализатор медиафайлов — сканирование папок и организация контента
 */

import * as fs from 'fs'
import * as path from 'path'
import { type AudioTrack, type MediaInfo, probeFile } from '../ffmpeg'
import { matchFonts } from './font-matcher'
import { getSubtitleInfo, type SubtitleInfo } from './subtitle-parser'

/** Расширения видеофайлов */
const VIDEO_EXTENSIONS = ['.mkv', '.mp4', '.avi', '.webm', '.mov', '.wmv']

/** Расширения аудиофайлов */
const AUDIO_EXTENSIONS = ['.mka', '.mp3', '.aac', '.flac', '.ogg', '.opus']

/** Расширения субтитров */
const SUBTITLE_EXTENSIONS = ['.ass', '.ssa', '.srt', '.vtt', '.sub']

/**
 * Паттерны для определения языка из пути файла
 * Приоритет: точные совпадения > частичные > und
 */
const LANGUAGE_PATTERNS: Array<{ pattern: RegExp; language: string }> = [
  // Русский
  { pattern: /\[rus\]|\(rus\)|\.rus\.|_rus_|russian|русский/i, language: 'ru' },
  { pattern: /rus[\s_-]?(sound|dub|audio|voice)/i, language: 'ru' },
  // Английский
  { pattern: /\[eng\]|\(eng\)|\.eng\.|_eng_|english|английский/i, language: 'en' },
  { pattern: /eng[\s_-]?(sound|dub|audio|voice)/i, language: 'en' },
  // Японский
  { pattern: /\[jap\]|\[jpn\]|\(jap\)|\(jpn\)|\.jap\.|\.jpn\.|_jap_|_jpn_|japanese|японский/i, language: 'ja' },
  { pattern: /jap[\s_-]?(sound|dub|audio|voice)|jpn[\s_-]?(sound|dub|audio|voice)/i, language: 'ja' },
  // Украинский
  { pattern: /\[ukr\]|\(ukr\)|\.ukr\.|_ukr_|ukrainian|украинский/i, language: 'uk' },
  // Китайский
  { pattern: /\[chi\]|\[chn\]|\(chi\)|\(chn\)|\.chi\.|\.chn\.|chinese|китайский/i, language: 'zh' },
  // Корейский
  { pattern: /\[kor\]|\(kor\)|\.kor\.|_kor_|korean|корейский/i, language: 'ko' },
]

/**
 * Определить язык из пути к файлу
 * Анализирует имя файла и родительские папки
 */
function detectLanguageFromPath(filePath: string): string {
  // Нормализуем путь и берём имя файла + 2 уровня папок
  const normalized = filePath.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const relevantParts = parts.slice(-3).join('/') // file + 2 parent folders

  for (const { pattern, language } of LANGUAGE_PATTERNS) {
    if (pattern.test(relevantParts)) {
      return language
    }
  }

  return 'und' // undetermined
}

/**
 * Результат анализа папки
 */
export interface FolderAnalysis {
  /** Корневая папка */
  rootPath: string
  /** Найденные видеофайлы */
  videos: MediaInfo[]
  /** Внешние аудиофайлы */
  externalAudio: Array<{
    path: string
    videoName: string // Имя видео, к которому относится
    info: AudioTrack
  }>
  /** Субтитры */
  subtitles: Array<{
    info: SubtitleInfo
    videoName: string // Имя видео, к которому относится
    fonts: string[] // Пути к шрифтам
  }>
  /** Папка со шрифтами (если найдена) */
  fontsDir: string | null
  /** Ошибки при анализе */
  errors: Array<{
    path: string
    message: string
  }>
}

/**
 * Найти папку со шрифтами
 */
function findFontsDir(rootPath: string): string | null {
  const possibleNames = ['Fonts', 'fonts', 'FONTS', 'Font', 'font']

  for (const name of possibleNames) {
    const fontDir = path.join(rootPath, name)
    if (fs.existsSync(fontDir) && fs.statSync(fontDir).isDirectory()) {
      return fontDir
    }
  }

  return null
}

/**
 * Связать файл с видео по имени
 *
 * Ищет общую часть в имени файла и видео
 */
function matchToVideo(filePath: string, videoNames: string[]): string | null {
  const fileName = path.basename(filePath, path.extname(filePath))

  for (const videoName of videoNames) {
    // Проверяем, содержит ли имя файла имя видео или наоборот
    if (fileName.includes(videoName) || videoName.includes(fileName)) {
      return videoName
    }
  }

  // Если не нашли точное совпадение, ищем по общим частям
  const fileWords = fileName.split(/[\s_\-[\]()]+/).filter(Boolean)

  for (const videoName of videoNames) {
    const videoWords = videoName.split(/[\s_\-[\]()]+/).filter(Boolean)

    // Считаем совпадающие слова
    const matches = fileWords.filter((fw) => videoWords.some((vw) => vw.toLowerCase() === fw.toLowerCase()))

    // Если больше половины слов совпало — считаем совпадением
    if (matches.length > fileWords.length / 2) {
      return videoName
    }
  }

  return null
}

/**
 * Анализировать папку с медиаконтентом
 *
 * Рекурсивно сканирует папку, находит видео, аудио и субтитры,
 * связывает их между собой
 */
export async function analyzeFolder(rootPath: string): Promise<FolderAnalysis> {
  const result: FolderAnalysis = {
    rootPath,
    videos: [],
    externalAudio: [],
    subtitles: [],
    fontsDir: findFontsDir(rootPath),
    errors: [],
  }

  // Собираем все файлы
  const videoFiles: string[] = []
  const audioFiles: string[] = []
  const subtitleFiles: string[] = []

  function scanDir(dir: string) {
    try {
      const entries = fs.readdirSync(dir)

      for (const entry of entries) {
        const fullPath = path.join(dir, entry)
        const stat = fs.lstatSync(fullPath)

        if (stat.isDirectory()) {
          // Пропускаем папку со шрифтами
          if (fullPath !== result.fontsDir) {
            scanDir(fullPath)
          }
        } else {
          const ext = path.extname(entry).toLowerCase()

          if (VIDEO_EXTENSIONS.includes(ext)) {
            videoFiles.push(fullPath)
          } else if (AUDIO_EXTENSIONS.includes(ext)) {
            audioFiles.push(fullPath)
          } else if (SUBTITLE_EXTENSIONS.includes(ext)) {
            subtitleFiles.push(fullPath)
          }
        }
      }
    } catch (error) {
      result.errors.push({
        path: dir,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  scanDir(rootPath)

  // Анализируем видеофайлы
  const videoNames: string[] = []

  for (const videoPath of videoFiles) {
    try {
      const info = await probeFile(videoPath)
      result.videos.push(info)
      videoNames.push(path.basename(videoPath, path.extname(videoPath)))
    } catch (error) {
      result.errors.push({
        path: videoPath,
        message: error instanceof Error ? error.message : 'Failed to probe video',
      })
    }
  }

  // Связываем внешние аудио с видео
  for (const audioPath of audioFiles) {
    const videoName = matchToVideo(audioPath, videoNames)
    if (videoName) {
      result.externalAudio.push({
        path: audioPath,
        videoName,
        info: {
          input: audioPath,
          index: 0,
          language: detectLanguageFromPath(audioPath),
          title: path.basename(audioPath, path.extname(audioPath)),
        },
      })
    }
  }

  // Обрабатываем субтитры
  for (const subPath of subtitleFiles) {
    const videoName = matchToVideo(subPath, videoNames)
    const subInfo = getSubtitleInfo(subPath)

    // Ищем шрифты
    let fonts: string[] = []
    if (result.fontsDir && subInfo.fontNames.length > 0) {
      fonts = matchFonts(result.fontsDir, subInfo.fontNames)
    }

    result.subtitles.push({
      info: subInfo,
      videoName: videoName || 'unknown',
      fonts,
    })
  }

  return result
}

/**
 * Сгруппировать результаты анализа по видео
 */
export function groupByVideo(analysis: FolderAnalysis): Map<
  string,
  {
    video: MediaInfo
    externalAudio: typeof analysis.externalAudio
    subtitles: typeof analysis.subtitles
  }
> {
  const groups = new Map<
    string,
    {
      video: MediaInfo
      externalAudio: typeof analysis.externalAudio
      subtitles: typeof analysis.subtitles
    }
  >()

  for (const video of analysis.videos) {
    const name = path.basename(video.path, path.extname(video.path))

    groups.set(name, {
      video,
      externalAudio: analysis.externalAudio.filter((a) => a.videoName === name),
      subtitles: analysis.subtitles.filter((s) => s.videoName === name),
    })
  }

  return groups
}
