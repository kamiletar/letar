/**
 * AssetBundler — копирование ресурсов для Web Player
 *
 * Для embedded режима: скачивает контент из IPFS и собирает структуру директории.
 * Для publish режима: создаёт виртуальную IPFS директорию из существующих CID.
 */

import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'

import type { QueueExportConfig } from '../../../shared/types/export-queue'
import { resolveTrackKey } from '../../../shared/types/track-key'
import type { WebExportProgress, WebPlayerManifest, WebPlayerResourceMode } from '../../../shared/types/web-player'
import { getIpfsUrl } from '../../utils/ipfs-url'
import { createModuleLogger } from '../../utils/logger'
import type { DirEntry } from '../ipfs/unixfs-service'

const log = createModuleLogger('AssetBundler')

/**
 * Читает SubtitlesOctopus файлы для включения в виртуальную директорию
 * В dev — из node_modules, в production — из resources
 */
async function readSubtitlesOctopusFiles(): Promise<DirEntry[]> {
  const entries: DirEntry[] = []

  try {
    let basePath: string
    let fontPath: string

    if (app.isPackaged) {
      // Production: файлы в resources/subtitles-octopus/
      basePath = path.join(process.resourcesPath, 'subtitles-octopus')
      fontPath = path.join(
        process.resourcesPath,
        'standalone',
        'apps',
        'animatrona',
        'renderer',
        'public',
        'default.woff2'
      )
    } else {
      // Dev: файлы в node_modules/libass-wasm/dist/js/
      basePath = path.join(__dirname, '../../node_modules/libass-wasm/dist/js')
      fontPath = path.join(__dirname, '../../renderer/public/default.woff2')
    }

    // Основной скрипт
    const mainJs = await fs.readFile(path.join(basePath, 'subtitles-octopus.js'))
    entries.push({ name: 'subtitles-octopus.js', type: 'file', content: mainJs })

    // Worker
    const workerJs = await fs.readFile(path.join(basePath, 'subtitles-octopus-worker.js'))
    entries.push({ name: 'subtitles-octopus-worker.js', type: 'file', content: workerJs })

    // WASM
    const wasmFile = await fs.readFile(path.join(basePath, 'subtitles-octopus-worker.wasm'))
    entries.push({ name: 'subtitles-octopus-worker.wasm', type: 'file', content: wasmFile })

    // Fallback шрифт (Liberation Sans)
    try {
      const fontFile = await fs.readFile(fontPath)
      entries.push({ name: 'default.woff2', type: 'file', content: fontFile })
    } catch {
      log.warn('default.woff2 not found, subtitles may not render correctly')
    }

    log.info('SubtitlesOctopus files loaded', { files: entries.map((e) => e.name) })
  } catch (error) {
    log.error('Failed to read SubtitlesOctopus files', {
      error: error instanceof Error ? error.message : String(error),
    })
  }

  return entries
}

/** Callback для прогресса */
type ProgressCallback = (progress: WebExportProgress) => void

/**
 * Скачивает файл из IPFS Gateway
 */
async function downloadFromIpfs(cid: string, destPath: string): Promise<void> {
  const url = getIpfsUrl(cid)!

  const response = await fetch(url)
  if (!response.ok) {
    await response.body?.cancel().catch(() => {
      /* игнорируем */
    })
    throw new Error(`Failed to download ${cid}: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  await fs.writeFile(destPath, Buffer.from(buffer))
}

/**
 * Копирует статические ресурсы плеера
 */
async function copyPlayerAssets(outputDir: string): Promise<void> {
  const playerDir = path.join(outputDir, 'player')
  await fs.mkdir(playerDir, { recursive: true })

  // Путь к ресурсам плеера (будет создан позже)
  const resourcesPath = app.isPackaged
    ? path.join(process.resourcesPath, 'web-player')
    : path.join(__dirname, '../../web-player/dist')

  // Проверяем существование директории
  try {
    await fs.access(resourcesPath)

    // Копируем все файлы плеера
    const files = await fs.readdir(resourcesPath)
    for (const file of files) {
      const srcPath = path.join(resourcesPath, file)
      const destPath = path.join(playerDir, file)
      await fs.copyFile(srcPath, destPath)
    }
  } catch {
    // Если ресурсы плеера не найдены, создаём заглушку
    log.warn('Web player assets not found, creating placeholder')

    // Создаём минимальный HTML
    const placeholderHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Web Player</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a1a; color: white; }
  </style>
</head>
<body>
  <p>Web Player assets not bundled. Use manifest.json with your own player.</p>
</body>
</html>`
    await fs.writeFile(path.join(playerDir, 'index.html'), placeholderHtml)
  }
}

/**
 * Генерирует index.html для папки экспорта
 */
async function generateIndexHtml(outputDir: string, animeName: string): Promise<void> {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${animeName} — Web Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { margin-bottom: 20px; }
    .player-frame { width: 100%; aspect-ratio: 16/9; border: none; background: #000; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${animeName}</h1>
    <iframe class="player-frame" src="player/index.html"></iframe>
  </div>
</body>
</html>`

  await fs.writeFile(path.join(outputDir, 'index.html'), html)
}

/**
 * Собирает ресурсы для Web Player экспорта
 */
export async function bundleAssets(
  config: QueueExportConfig,
  outputDir: string,
  mode: WebPlayerResourceMode,
  selectedEpisodes: number[],
  onProgress?: ProgressCallback
): Promise<void> {
  // Создаём основную директорию
  await fs.mkdir(outputDir, { recursive: true })

  // publish режим работает как embedded — скачивает все файлы, потом публикует в IPFS
  const downloadContent = mode === 'embedded' || mode === 'publish'
  const totalSteps = downloadContent
    ? selectedEpisodes.length + 3 // episodes + player + index + manifest
    : 3 // только player + index + manifest

  let currentStep = 0

  const reportProgress = (stage: WebExportProgress['stage'], message: string, currentFile?: string) => {
    currentStep++
    onProgress?.({
      stage,
      percent: Math.round((currentStep / totalSteps) * 100),
      message,
      currentFile,
    })
  }

  // 1. Копируем ресурсы плеера
  reportProgress('copying-assets', 'Копирование плеера...')
  await copyPlayerAssets(outputDir)

  // 2. Для embedded/publish режима — скачиваем контент из IPFS
  if (downloadContent) {
    const episodesDir = path.join(outputDir, 'episodes')
    await fs.mkdir(episodesDir, { recursive: true })

    const episodes = config.episodes
      .filter((ep) => selectedEpisodes.includes(ep.number))
      .sort((a, b) => a.number - b.number)

    for (const ep of episodes) {
      const epDir = path.join(episodesDir, String(ep.number).padStart(2, '0'))
      await fs.mkdir(epDir, { recursive: true })

      reportProgress('copying-assets', `Эпизод ${ep.number}...`, ep.name || `Episode ${ep.number}`)

      // Видео
      await downloadFromIpfs(ep.videoCid, path.join(epDir, 'video.webm'))

      // Аудио
      const audioDir = path.join(epDir, 'audio')
      await fs.mkdir(audioDir, { recursive: true })

      for (const track of ep.audioTracks) {
        const key = resolveTrackKey(track.language, track.title)
        if (config.selectedAudioKeys.includes(key)) {
          await downloadFromIpfs(track.transcodedCid, path.join(audioDir, `${track.language}.m4a`))
        }
      }

      // Субтитры
      const subsDir = path.join(epDir, 'subs')
      await fs.mkdir(subsDir, { recursive: true })

      for (const track of ep.subtitleTracks) {
        const key = resolveTrackKey(track.language, track.title)
        if (config.selectedSubtitleKeys.includes(key)) {
          await downloadFromIpfs(track.fileCid, path.join(subsDir, `${track.language}.ass`))

          // Шрифты
          if (track.fontCids.length > 0) {
            const fontsDir = path.join(epDir, 'fonts')
            await fs.mkdir(fontsDir, { recursive: true })

            for (let i = 0; i < track.fontCids.length; i++) {
              await downloadFromIpfs(track.fontCids[i], path.join(fontsDir, `font${i}.ttf`))
            }
          }
        }
      }
    }

    // Постер
    if (config.posterCid) {
      await downloadFromIpfs(config.posterCid, path.join(outputDir, 'poster.webp'))
    }
  }

  // 3. Генерируем index.html
  reportProgress('bundling-player', 'Генерация index.html...')
  await generateIndexHtml(outputDir, config.animeName)

  reportProgress('done', 'Готово!')
}

/**
 * Создаёт структуру DirEntry[] для виртуальной IPFS директории (режим publish)
 *
 * Эта функция НЕ скачивает файлы — она создаёт структуру ссылок на существующие CID.
 * Используется в WebExportManager.publishVirtual() для мгновенной публикации.
 *
 * @param config - Конфигурация экспорта
 * @param selectedEpisodes - Номера выбранных эпизодов
 * @param manifest - Уже сгенерированный манифест
 * @returns Массив DirEntry для передачи в createDirectoryFromCids()
 */
export async function buildDirectoryStructure(
  config: QueueExportConfig,
  selectedEpisodes: number[],
  manifest: WebPlayerManifest
): Promise<DirEntry[]> {
  const entries: DirEntry[] = []

  // 1. index.html
  const indexHtml = generateIndexHtmlContent(config.animeName)
  entries.push({
    name: 'index.html',
    type: 'file',
    content: Buffer.from(indexHtml),
  })

  // 2. manifest.json
  entries.push({
    name: 'manifest.json',
    type: 'file',
    content: Buffer.from(JSON.stringify(manifest, null, 2)),
  })

  // 3. poster.webp (если есть)
  if (config.posterCid) {
    entries.push({
      name: 'poster.webp',
      type: 'file',
      cid: config.posterCid,
    })
  }

  // 4. episodes/
  const episodesDir: DirEntry = {
    name: 'episodes',
    type: 'directory',
    children: [],
  }

  const episodes = config.episodes
    .filter((ep) => selectedEpisodes.includes(ep.number))
    .sort((a, b) => a.number - b.number)

  for (const ep of episodes) {
    const epDirName = String(ep.number).padStart(2, '0')

    // Собираем файлы эпизода
    const epChildren: DirEntry[] = []

    // video.webm
    epChildren.push({
      name: 'video.webm',
      type: 'file',
      cid: ep.videoCid,
    })

    // audio/
    const audioChildren: DirEntry[] = ep.audioTracks
      .filter((t) => {
        const key = resolveTrackKey(t.language, t.title)
        return config.selectedAudioKeys.includes(key)
      })
      .map((t) => ({
        name: `${t.language}.m4a`,
        type: 'file' as const,
        cid: t.transcodedCid,
      }))

    if (audioChildren.length > 0) {
      epChildren.push({
        name: 'audio',
        type: 'directory',
        children: audioChildren,
      })
    }

    // subs/
    const subsChildren: DirEntry[] = []
    const fontsMap = new Map<string, string>() // Дедупликация шрифтов

    for (const track of ep.subtitleTracks) {
      const key = resolveTrackKey(track.language, track.title)
      if (!config.selectedSubtitleKeys.includes(key)) {
        continue
      }

      subsChildren.push({
        name: `${track.language}.ass`,
        type: 'file',
        cid: track.fileCid,
      })

      // Собираем шрифты
      track.fontCids.forEach((fontCid, _i) => {
        if (!fontsMap.has(fontCid)) {
          fontsMap.set(fontCid, `font${fontsMap.size}.ttf`)
        }
      })
    }

    if (subsChildren.length > 0) {
      epChildren.push({
        name: 'subs',
        type: 'directory',
        children: subsChildren,
      })
    }

    // fonts/
    if (fontsMap.size > 0) {
      const fontsChildren: DirEntry[] = []
      fontsMap.forEach((fileName, fontCid) => {
        fontsChildren.push({
          name: fileName,
          type: 'file',
          cid: fontCid,
        })
      })

      epChildren.push({
        name: 'fonts',
        type: 'directory',
        children: fontsChildren,
      })
    }

    episodesDir.children!.push({
      name: epDirName,
      type: 'directory',
      children: epChildren,
    })
  }

  entries.push(episodesDir)

  // 5. lib/subtitles-octopus/ — библиотека для ASS субтитров
  const subtitlesOctopusFiles = await readSubtitlesOctopusFiles()
  if (subtitlesOctopusFiles.length > 0) {
    // Извлекаем default.woff2 для добавления в корень
    // (SubtitlesOctopus ищет fallback шрифт относительно страницы, не worker'а)
    const fallbackFont = subtitlesOctopusFiles.find((f) => f.name === 'default.woff2')
    if (fallbackFont) {
      entries.push({
        name: 'default.woff2',
        type: 'file',
        content: fallbackFont.content,
      })
    }

    // Файлы библиотеки (без fallback шрифта — он уже в корне)
    const libFiles = subtitlesOctopusFiles.filter((f) => f.name !== 'default.woff2')
    entries.push({
      name: 'lib',
      type: 'directory',
      children: [
        {
          name: 'subtitles-octopus',
          type: 'directory',
          children: libFiles,
        },
      ],
    })
  }

  return entries
}

/**
 * Генерирует контент index.html — standalone Web Player
 * Весь CSS и JS встроены inline для работы без дополнительных файлов
 */
function generateIndexHtmlContent(animeName: string): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(animeName)} — Web Player</title>
  <script src="./lib/subtitles-octopus/subtitles-octopus.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --color-bg: #0a0a0a;
      --color-surface: #141414;
      --color-surface-hover: #1f1f1f;
      --color-border: #2a2a2a;
      --color-text: #ffffff;
      --color-text-muted: #888888;
      --color-primary: #9333ea;
    }
    html, body { height: 100%; font-family: system-ui, sans-serif; background: var(--color-bg); color: var(--color-text); overflow: hidden; }
    #app { display: flex; flex-direction: column; height: 100%; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
    .title { font-size: 18px; font-weight: 600; }
    .header-info { color: var(--color-text-muted); font-size: 14px; }
    .main { display: flex; flex: 1; overflow: hidden; }
    .player-container { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; position: relative; }
    .video-wrapper { position: relative; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .video-wrapper video { max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain; }
    /* SubtitlesOctopus canvas — центрируем так же как видео */
    .libassjs-canvas-parent { position: absolute !important; inset: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; pointer-events: none !important; }
    .libassjs-canvas-parent > canvas { position: static !important; max-width: 100% !important; max-height: 100% !important; }
    .controls-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.7) 100%); opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .video-wrapper:hover .controls-overlay, .controls-overlay.visible { opacity: 1; pointer-events: auto; }
    .controls-top { padding: 16px 20px; }
    .episode-title { font-size: 14px; color: var(--color-text-muted); }
    .controls-center { display: flex; align-items: center; justify-content: center; }
    .controls-bottom { padding: 12px 20px; }
    .progress-container { margin-bottom: 12px; }
    .progress-bar { position: relative; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; cursor: pointer; }
    .progress-bar:hover { height: 6px; }
    .progress-played { position: absolute; left: 0; top: 0; height: 100%; background: var(--color-primary); border-radius: 2px; }
    .progress-buffered { position: absolute; left: 0; top: 0; height: 100%; background: rgba(255,255,255,0.3); border-radius: 2px; z-index: -1; }
    .controls-row { display: flex; align-items: center; justify-content: space-between; }
    .controls-left, .controls-right { display: flex; align-items: center; gap: 8px; }
    .btn-icon { width: 40px; height: 40px; border: none; background: transparent; color: var(--color-text); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
    .btn-icon:hover { background: rgba(255,255,255,0.1); }
    .btn-icon svg { width: 24px; height: 24px; fill: currentColor; }
    .btn-play { width: 64px; height: 64px; background: rgba(255,255,255,0.1); border-radius: 50%; }
    .btn-play svg { width: 32px; height: 32px; }
    .btn-play .icon-pause, .video-wrapper.paused .btn-play .icon-play { display: none; }
    .video-wrapper.paused .btn-play .icon-pause { display: block; }
    .btn-text { padding: 6px 12px; border: none; background: transparent; color: var(--color-text); font-size: 14px; cursor: pointer; border-radius: 4px; }
    .btn-text:hover { background: rgba(255,255,255,0.1); }
    .time-display { font-size: 14px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
    .volume-control { display: flex; align-items: center; gap: 4px; }
    .volume-slider { width: 80px; height: 4px; -webkit-appearance: none; background: rgba(255,255,255,0.2); border-radius: 2px; }
    .volume-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: var(--color-text); border-radius: 50%; }
    .dropdown { position: relative; }
    .dropdown-menu { position: absolute; bottom: 100%; right: 0; margin-bottom: 8px; min-width: 150px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 4px; display: none; z-index: 100; }
    .dropdown.open .dropdown-menu { display: block; }
    .dropdown-item { display: block; width: 100%; padding: 8px 12px; border: none; background: transparent; color: var(--color-text); font-size: 14px; text-align: left; cursor: pointer; border-radius: 4px; }
    .dropdown-item:hover { background: var(--color-surface-hover); }
    .dropdown-item.active { background: var(--color-primary); }
    .sidebar { width: 280px; background: var(--color-surface); border-left: 1px solid var(--color-border); display: flex; flex-direction: column; overflow: hidden; }
    .sidebar-title { font-size: 14px; font-weight: 600; padding: 16px; border-bottom: 1px solid var(--color-border); }
    .episode-list { flex: 1; overflow-y: auto; padding: 8px; }
    .episode-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; cursor: pointer; }
    .episode-item:hover { background: var(--color-surface-hover); }
    .episode-item.active { background: var(--color-primary); }
    .episode-number { font-size: 14px; font-weight: 600; color: var(--color-text-muted); min-width: 32px; }
    .episode-item.active .episode-number { color: var(--color-text); }
    .episode-name { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    @media (max-width: 768px) { .sidebar { display: none; } }
    .video-wrapper.fullscreen { position: fixed; inset: 0; z-index: 9999; background: #000; }
  </style>
</head>
<body>
  <div id="app">
    <header class="header">
      <h1 class="title" id="anime-title">${escapeHtml(animeName)}</h1>
      <div class="header-info"><span id="anime-year"></span></div>
    </header>
    <main class="main">
      <div class="player-container">
        <div class="video-wrapper" id="video-wrapper">
          <video id="video" playsinline></video>
          <audio id="audio" style="display:none"></audio>
          <div class="controls-overlay" id="controls">
            <div class="controls-top"><span class="episode-title" id="episode-title"></span></div>
            <div class="controls-center">
              <button class="btn-icon btn-play" id="btn-play">
                <svg class="icon-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                <svg class="icon-pause" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </button>
            </div>
            <div class="controls-bottom">
              <div class="progress-container">
                <div class="progress-bar" id="progress-bar">
                  <div class="progress-buffered" id="progress-buffered"></div>
                  <div class="progress-played" id="progress-played"></div>
                </div>
              </div>
              <div class="controls-row">
                <div class="controls-left">
                  <button class="btn-icon" id="btn-rewind"><svg viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg></button>
                  <button class="btn-icon" id="btn-forward"><svg viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg></button>
                  <span class="time-display"><span id="time-current">0:00</span> / <span id="time-duration">0:00</span></span>
                </div>
                <div class="controls-right">
                  <div class="volume-control">
                    <button class="btn-icon" id="btn-mute"><svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg></button>
                    <input type="range" class="volume-slider" id="volume-slider" min="0" max="1" step="0.05" value="1">
                  </div>
                  <div class="dropdown" id="audio-dropdown">
                    <button class="btn-text" id="btn-audio">Audio</button>
                    <div class="dropdown-menu" id="audio-menu"></div>
                  </div>
                  <div class="dropdown" id="subtitle-dropdown">
                    <button class="btn-text" id="btn-subtitle">Subs</button>
                    <div class="dropdown-menu" id="subtitle-menu"></div>
                  </div>
                  <button class="btn-icon" id="btn-fullscreen"><svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <aside class="sidebar" id="sidebar">
        <h2 class="sidebar-title">Episodes</h2>
        <div class="episode-list" id="episode-list"></div>
      </aside>
    </main>
  </div>
  <script>
(function(){
  var GATEWAYS = ['http://127.0.0.1:8081/ipfs/', 'https://ipfs.io/ipfs/'];
  var manifest = null, currentEp = 0, currentAudio = null, currentSub = null;
  var rootCid = null, storageKey = null, lastSaveTime = 0;
  var octopus = null; // SubtitlesOctopus instance for ASS subtitles
  var $ = function(id) { return document.getElementById(id); };
  var video = $('video'), audio = $('audio'), wrapper = $('video-wrapper');
  var progressBar = $('progress-bar'), progressPlayed = $('progress-played');
  var volumeSlider = $('volume-slider'), episodeList = $('episode-list');

  // Получаем root CID из URL для уникального ключа localStorage
  function getRootCid() {
    var match = location.pathname.match(/\\/ipfs\\/([^\\/]+)/);
    return match ? match[1] : 'local';
  }

  // Сохранение прогресса в localStorage
  function saveProgress() {
    if (!storageKey || !manifest) return;
    var now = Date.now();
    // Сохраняем не чаще раза в 3 секунды
    if (now - lastSaveTime < 3000) return;
    lastSaveTime = now;
    try {
      var data = {
        episode: currentEp,
        time: video.currentTime || 0,
        audio: currentAudio,
        subtitle: currentSub,
        volume: video.volume,
        updatedAt: now
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) { console.warn('Failed to save progress:', e); }
  }

  // Принудительное сохранение (при смене эпизода/дорожки)
  function saveProgressForce() {
    lastSaveTime = 0;
    saveProgress();
  }

  // Загрузка прогресса из localStorage
  function loadProgress() {
    if (!storageKey) return null;
    try {
      var data = localStorage.getItem(storageKey);
      return data ? JSON.parse(data) : null;
    } catch (e) { return null; }
  }

  function init() {
    rootCid = getRootCid();
    storageKey = 'animatrona-' + rootCid;

    fetch('./manifest.json').then(function(res) { return res.json(); }).then(function(data) {
      manifest = data;
      $('anime-title').textContent = manifest.anime.name;
      if (manifest.anime.year) $('anime-year').textContent = manifest.anime.year;
      renderEpisodes();
      setupEvents();

      // Восстанавливаем прогресс
      var saved = loadProgress();
      if (saved && manifest.episodes.length > 0) {
        var epIdx = Math.min(saved.episode || 0, manifest.episodes.length - 1);
        loadEpisode(epIdx, saved.time, saved.audio, saved.subtitle);
        if (typeof saved.volume === 'number') {
          video.volume = audio.volume = saved.volume;
          volumeSlider.value = saved.volume;
        }
      } else if (manifest.episodes.length > 0) {
        loadEpisode(0);
      }
    }).catch(function(e) { console.error('Failed to load manifest:', e); });
  }

  function renderEpisodes() {
    while (episodeList.firstChild) episodeList.removeChild(episodeList.firstChild);
    manifest.episodes.forEach(function(ep, i) {
      var item = document.createElement('div');
      item.className = 'episode-item';
      var numSpan = document.createElement('span');
      numSpan.className = 'episode-number';
      numSpan.textContent = ep.number;
      var nameSpan = document.createElement('span');
      nameSpan.className = 'episode-name';
      nameSpan.textContent = ep.name || 'Episode ' + ep.number;
      item.appendChild(numSpan);
      item.appendChild(nameSpan);
      item.onclick = function() { loadEpisode(i, null, currentAudio, currentSub); };
      episodeList.appendChild(item);
    });
  }

  function getUrl(src) {
    if (manifest.resourceMode === 'embedded' || src.startsWith('./')) return src;
    return GATEWAYS[0] + src;
  }

  function loadEpisode(idx, seekTime, savedAudio, savedSub) {
    var ep = manifest.episodes[idx];
    currentEp = idx;
    episodeList.querySelectorAll('.episode-item').forEach(function(el, i) { el.classList.toggle('active', i === idx); });
    $('episode-title').textContent = 'S' + ep.season + 'E' + ep.number + ' — ' + (ep.name || 'Episode ' + ep.number);
    video.src = getUrl(ep.video);

    // Выбираем аудиодорожку: сохранённая > дефолтная > первая
    var audioKey = savedAudio || manifest.defaults.audioTrack;
    var track = audioKey ? ep.audio.find(function(a) { return a.language + ':' + a.title === audioKey; }) : null;
    if (!track && ep.audio.length > 0) track = ep.audio[0];
    if (track) selectAudio(track.language + ':' + track.title, true);

    // Выбираем субтитры: сохранённые > дефолтные > выключены
    var subKey = savedSub !== undefined ? savedSub : manifest.defaults.subtitleTrack;
    selectSubtitle(subKey || null, true);

    updateAudioMenu();
    updateSubMenu();

    video.load();

    // Восстанавливаем позицию после загрузки метаданных
    if (seekTime && seekTime > 0) {
      video.onloadedmetadata = function() {
        $('time-duration').textContent = formatTime(video.duration);
        // Не восстанавливаем если почти в конце (< 30 сек до конца)
        if (seekTime < video.duration - 30) {
          video.currentTime = seekTime;
          audio.currentTime = seekTime;
        }
        video.onloadedmetadata = function() { $('time-duration').textContent = formatTime(video.duration); };
      };
    }

    video.play().catch(function() { wrapper.classList.add('paused'); });
    saveProgressForce();
  }

  function selectAudio(key, silent) {
    var ep = manifest.episodes[currentEp];
    var track = ep.audio.find(function(a) { return a.language + ':' + a.title === key; });
    if (!track) return;
    currentAudio = key;
    var t = video.currentTime, playing = !video.paused;
    audio.src = getUrl(track.src);
    audio.currentTime = t;
    audio.volume = video.volume;
    if (playing) audio.play().catch(function() {});
    updateAudioMenu();
    if (!silent) saveProgressForce();
  }

  function selectSubtitle(key, silent) {
    currentSub = key;
    updateSubMenu();
    if (!silent) saveProgressForce();

    // Уничтожаем предыдущий инстанс
    if (octopus) {
      octopus.dispose();
      octopus = null;
    }

    // Если выбрано "Off" — просто выходим
    if (!key) return;

    // Находим трек субтитров
    var ep = manifest.episodes[currentEp];
    var track = ep.subtitles.find(function(s) { return s.language + ':' + s.title === key; });
    if (!track) return;

    // Функция инициализации SubtitlesOctopus
    function initOctopus() {
      // Проверяем размеры видео
      if (!video.videoWidth || !video.videoHeight) {
        console.warn('Video dimensions not available, retrying...');
        setTimeout(initOctopus, 100);
        return;
      }

      // Собираем URL шрифтов
      var fonts = [];
      if (track.fonts && track.fonts.length > 0) {
        fonts = track.fonts.map(function(f) { return getUrl(f); });
      }

      try {
        octopus = new SubtitlesOctopus({
          video: video,
          subUrl: getUrl(track.src),
          fonts: fonts,
          workerUrl: './lib/subtitles-octopus/subtitles-octopus-worker.js',
          // fallbackFont резолвится относительно worker'а, поэтому ../../ для выхода из lib/subtitles-octopus/
          fallbackFont: '../../default.woff2',
          // targetParent — контейнер для canvas (должен иметь position: relative)
          targetParent: wrapper,
          debug: false
        });
      } catch (e) {
        console.error('Failed to init SubtitlesOctopus:', e);
      }
    }

    // Запускаем инициализацию — она сама проверит размеры и подождёт
    initOctopus();
  }

  function updateAudioMenu() {
    var menu = $('audio-menu'), ep = manifest.episodes[currentEp];
    while (menu.firstChild) menu.removeChild(menu.firstChild);
    ep.audio.forEach(function(t) {
      var key = t.language + ':' + t.title;
      var btn = document.createElement('button');
      btn.className = 'dropdown-item' + (key === currentAudio ? ' active' : '');
      btn.textContent = t.title + ' (' + t.language.toUpperCase() + ')';
      btn.onclick = function() { selectAudio(key); closeDropdowns(); };
      menu.appendChild(btn);
    });
  }

  function updateSubMenu() {
    var menu = $('subtitle-menu'), ep = manifest.episodes[currentEp];
    while (menu.firstChild) menu.removeChild(menu.firstChild);

    var offBtn = document.createElement('button');
    offBtn.className = 'dropdown-item' + (!currentSub ? ' active' : '');
    offBtn.textContent = 'Off';
    offBtn.onclick = function() { selectSubtitle(null); closeDropdowns(); };
    menu.appendChild(offBtn);

    ep.subtitles.forEach(function(t) {
      var key = t.language + ':' + t.title;
      var btn = document.createElement('button');
      btn.className = 'dropdown-item' + (key === currentSub ? ' active' : '');
      btn.textContent = t.title + ' (' + t.language.toUpperCase() + ')';
      btn.onclick = function() { selectSubtitle(key); closeDropdowns(); };
      menu.appendChild(btn);
    });
  }

  function closeDropdowns() { document.querySelectorAll('.dropdown').forEach(function(d) { d.classList.remove('open'); }); }

  function formatTime(s) { if (!isFinite(s)) return '0:00'; return Math.floor(s/60) + ':' + String(Math.floor(s%60)).padStart(2,'0'); }

  function setupEvents() {
    $('btn-play').onclick = function() { video.paused ? video.play() : video.pause(); };
    video.onclick = function() { video.paused ? video.play() : video.pause(); };
    video.onplay = function() { wrapper.classList.remove('paused'); audio.play().catch(function() {}); };
    video.onpause = function() { wrapper.classList.add('paused'); audio.pause(); saveProgress(); };
    video.ontimeupdate = function() {
      if (video.duration) {
        progressPlayed.style.width = (video.currentTime / video.duration * 100) + '%';
        $('time-current').textContent = formatTime(video.currentTime);
        saveProgress();
      }
    };
    video.onloadedmetadata = function() { $('time-duration').textContent = formatTime(video.duration); };
    // Автопереход на следующую серию с сохранением выбранных дорожек
    video.onended = function() {
      if (currentEp < manifest.episodes.length - 1) {
        loadEpisode(currentEp + 1, null, currentAudio, currentSub);
      }
    };
    progressBar.onclick = function(e) {
      var rect = progressBar.getBoundingClientRect();
      var pct = (e.clientX - rect.left) / rect.width;
      video.currentTime = audio.currentTime = pct * video.duration;
      saveProgressForce();
    };
    volumeSlider.oninput = function() { video.volume = audio.volume = parseFloat(volumeSlider.value); saveProgress(); };
    $('btn-mute').onclick = function() { video.muted = audio.muted = !video.muted; };
    $('btn-rewind').onclick = function() { video.currentTime = audio.currentTime = Math.max(0, video.currentTime - 10); saveProgressForce(); };
    $('btn-forward').onclick = function() { video.currentTime = audio.currentTime = Math.min(video.duration, video.currentTime + 10); saveProgressForce(); };
    $('btn-fullscreen').onclick = function() {
      if (document.fullscreenElement) { document.exitFullscreen(); wrapper.classList.remove('fullscreen'); }
      else { wrapper.requestFullscreen(); wrapper.classList.add('fullscreen'); }
    };
    $('btn-audio').onclick = function() { closeDropdowns(); $('audio-dropdown').classList.toggle('open'); };
    $('btn-subtitle').onclick = function() { closeDropdowns(); $('subtitle-dropdown').classList.toggle('open'); };
    document.onclick = function(e) { if (!e.target.closest('.dropdown')) closeDropdowns(); };
    setInterval(function() { if (Math.abs(video.currentTime - audio.currentTime) > 0.1) audio.currentTime = video.currentTime; }, 1000);
    var timeout;
    wrapper.onmousemove = function() { $('controls').classList.add('visible'); clearTimeout(timeout); timeout = setTimeout(function() { if (!video.paused) $('controls').classList.remove('visible'); }, 3000); };
    wrapper.classList.add('paused');

    // Сохраняем при закрытии страницы
    window.addEventListener('beforeunload', function() { lastSaveTime = 0; saveProgress(); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
  </script>
</body>
</html>`
}

/**
 * Экранирует HTML специальные символы
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}
