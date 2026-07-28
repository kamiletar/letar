/**
 * Animatrona - Electron Main Process
 *
 * Точка входа для Electron приложения.
 * Управляет окнами, IPC и нативными модулями (FFmpeg).
 */

// ============================================================================
// ВАЖНО: Этот код должен быть в самом начале, ДО любых импортов
// Обрабатываем EPIPE ошибки в production (нет консоли в packaged app)
// ============================================================================
if (process.stdout && typeof process.stdout.on === 'function') {
  process.stdout.on('error', (err) => {
    if (err.code === 'EPIPE') {
      return
    } // Игнорируем broken pipe
  })
}
if (process.stderr && typeof process.stderr.on === 'function') {
  process.stderr.on('error', (err) => {
    if (err.code === 'EPIPE') {
      return
    } // Игнорируем broken pipe
  })
}

// ============================================================================
// Глобальные обработчики ошибок
// Перехватываем необработанные исключения и rejection'ы чтобы не крашить приложение
// Особенно важно для сетевых ошибок типа "TypeError: terminated" от undici
// ============================================================================

/** Записать ошибку в crash-log файл */
function writeCrashLog(type: string, error: unknown): void {
  try {
    const fs = require('node:fs')
    const nodePath = require('node:path')
    // Используем APPDATA для production, текущую директорию для dev
    const logDir = process.env.APPDATA
      ? nodePath.join(process.env.APPDATA, '@lena', 'animatrona', 'data')
      : nodePath.join(__dirname, '..', '..', 'prisma', 'data')
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    const logPath = nodePath.join(logDir, 'crash.log')
    const timestamp = new Date().toISOString()
    const errorStr = error instanceof Error ? `${error.message}\n${error.stack}` : String(error)
    const entry = `[${timestamp}] ${type}: ${errorStr}\n\n`
    fs.appendFileSync(logPath, entry, 'utf-8')
  } catch {
    // Запись лога не должна вызывать краш
  }
}

process.on('uncaughtException', (error) => {
  // Игнорируем "terminated" ошибки от undici — это нормально при закрытии соединений
  if (error instanceof TypeError && error.message === 'terminated') {
    return
  }
  // Для остальных ошибок — логируем в файл и консоль
  writeCrashLog('uncaughtException', error)
  console.error('[uncaughtException]', error)
})

process.on('unhandledRejection', (reason) => {
  // Игнорируем "terminated" ошибки от undici
  if (reason instanceof TypeError && (reason as TypeError).message === 'terminated') {
    return
  }
  // Игнорируем AbortError — это ожидаемое поведение при отмене запросов
  if (reason instanceof Error && reason.name === 'AbortError') {
    return
  }
  // Для остальных — логируем в файл и консоль
  writeCrashLog('unhandledRejection', reason)
  console.error('[unhandledRejection]', reason)
})

// ============================================================================
// DEBUG логирование libp2p (опционально)
// Включается через переменную окружения DEBUG_LIBP2P=1
// Полезно для глубокой отладки P2P connectivity
// libp2p использует пакет 'debug' который читает переменную DEBUG
// ============================================================================
if (process.env.DEBUG_LIBP2P === '1' && !process.env.DEBUG) {
  process.env.DEBUG = 'libp2p:*,kubo:*'
  // eslint-disable-next-line no-console -- намеренный вывод при включении отладки libp2p
  console.log('[libp2p] DEBUG логирование включено через DEBUG env')
}

import { app, BrowserWindow, crashReporter, dialog, Menu, powerMonitor, powerSaveBlocker, session } from 'electron'
import path from 'path'
import { registerIpcHandlers } from './ipc'
import { setMainWindowForMigration, setNeedsSetup } from './ipc/app.handlers'
import { initAllowedPaths } from './protocols/allowed-paths'
import { registerMediaProtocol, setupMediaProtocolHandler } from './protocols/media.protocol'
import { getAchievementService } from './services/achievements'
import { getBonusService } from './services/bonus'
import { initializeDatabase, migrateFromOldPath } from './services/database'
import { getDeepLinkService } from './services/deep-link'
import { getDistributionService } from './services/distribution-service'
import { getKuboService } from './services/kubo'
import { getMobileServer } from './services/mobile-server'
import { mobileProgressEvents } from './services/mobile-server/progress-events'
import { startNextServer, stopNextServer } from './services/next-server'
import { getReputationService } from './services/reputation'
import { getStatsTracker } from './services/stats'
import {
  getFriendRequestsSync,
  getPresenceSync,
  getUserProfileSync,
  getWatchPartySync,
  getWatchProgressSync,
} from './services/sync'
import { createMainWindow, createSplashWindow } from './services/window-manager'
import { destroyTray, initTray } from './tray'
import { initAutoUpdater } from './updater'
import { createModuleLogger } from './utils/logger'

const log = createModuleLogger('App')

/** ID блокировщика энергосбережения для IPFS */
let ipfsPowerSaveBlockerId: number | null = null

// Устанавливаем правильное имя приложения для userData пути
// Без этого Electron использует name из package.json (@letar/animatrona)
// и создаёт путь с @ который выглядит странно
app.name = 'Animatrona'

// Устанавливаем App User Model ID для Windows таскбара
// Должно совпадать с appId из electron-builder.yml
if (process.platform === 'win32') {
  app.setAppUserModelId('com.letar.animatrona')
}

// Запретить Chromium троттлить фоновые процессы
// Без этого Windows помечает приложение как "Efficiency Mode" при сворачивании в трей
app.commandLine.appendSwitch('disable-renderer-backgrounding')
app.commandLine.appendSwitch('disable-background-timer-throttling')

// Разрешить ручной вызов GC (global.gc()) для тяжёлых операций (регенерация манифестов)
// --max-old-space-size=4096: увеличиваем heap до 4GB для регенерации 167+ манифестов
// (по умолчанию V8 ограничивает heap ~1.5GB, чего не хватает при долгих batch-операциях)
app.commandLine.appendSwitch('js-flags', '--expose-gc --max-old-space-size=4096')

// Регистрируем кастомный протокол media:// ДО app.whenReady()
registerMediaProtocol()

// В packaged Electron app.isPackaged === true
const isProd = app.isPackaged || process.env.NODE_ENV === 'production'

// Crash Reporter — ловит native crash'и (сегфолты в C++ коде Electron/Kubo/Node)
// Дампы сохраняются в %APPDATA%/@letar/animatrona/Crashpad (или Crash Reports)
crashReporter.start({
  productName: 'Animatrona',
  submitURL: '', // Без отправки — только локальные дампы
  uploadToServer: false,
})

// Инициализация приложения
app.whenReady().then(async () => {
  // Secure DNS ЯВНО выключаем ('off'). Chromium по умолчанию сам может включить
  // 'automatic' upgrade на публичный DoH-резолвер, если распознаёт текущий DNS-провайдер —
  // это в обход Fake-IP DNS Clash-подобных прокси (FlClash и т.п. в режиме TUN с доменной
  // маршрутизацией по правилам). Такой прокси перехватывает системные DNS-запросы, чтобы
  // привязать TCP/TLS-соединение к домену и применить правило; DoH резолвит домен напрямую,
  // прокси теряет привязку — и трафик уходит не туда (хотя обычный сокет по тому же пути работает).
  // Явный 'off' гарантирует, что Electron всегда использует системный DNS, как и браузер.
  try {
    app.configureHostResolver({ secureDnsMode: 'off' })
    log.info('Secure DNS явно выключен — используется системный DNS')
  } catch (err) {
    log.warn('Не удалось настроить DNS resolver', { error: String(err) })
  }

  // Shikimori — обход системного прокси/TUN-VPN (Clash и т.п.).
  // net.fetch (Chromium network stack) в отличие от обычного Node-сокета уважает системные
  // настройки прокси — если Clash/FlClash перехватывает трафик к shikimori.io/.one по правилу
  // (хотя в блокировке нуждается только rutracker.org), запрос может рваться на стороне
  // прокси-нода (net::ERR_FAILED) даже когда DNS уже резолвится верно (secureDnsMode: 'off'
  // выше чинит только DNS-часть, не сам факт перехвата трафика). Диагностика подтверждает:
  // тот же запрос через обычный Node-сокет (в обход системного прокси) проходит с 200 OK.
  // proxyBypassRules заставляет net.fetch идти напрямую для этих доменов независимо от
  // системного прокси/VPN пользователя.
  try {
    await session.defaultSession.setProxy({
      mode: 'system',
      proxyBypassRules: 'shikimori.io,shikimori.one,*.shikimori.io,*.shikimori.one',
    })
    log.info('Прокси-исключение для Shikimori настроено (proxyBypassRules)')
  } catch (err) {
    log.warn('Не удалось настроить proxyBypassRules для Shikimori', { error: String(err) })
  }

  // Миграция данных из старого пути @letar/animatrona в новый Animatrona
  // Должна быть до initializeDatabase() чтобы БД была на новом месте
  migrateFromOldPath()

  // Инициализируем БД при первом запуске / применяем миграции при обновлении
  // ВАЖНО: initializeDatabase() использует sql.js и перезаписывает файл БД целиком.
  // PrismaClient НЕ должен открывать WAL-соединение до завершения миграций.
  await initializeDatabase()

  // Теперь безопасно инициализировать SQLite PRAGMAs (WAL mode, busy_timeout)
  // — sql.js уже закончил работу с файлом
  const { initializePrismaDb } = await import('./utils/db')
  await initializePrismaDb()

  // Инициализируем встроенные профили кодирования (до renderer)
  try {
    const { getGpuCapability } = await import('./utils/hardware-info')
    const { seedEncodingProfiles } = await import('./services/encoding-profile/seed-encoding-profiles')
    const gpuCap = await getGpuCapability()
    await seedEncodingProfiles(gpuCap.generation)

    // При первом запуске — выставляем useGpu по возможностям GPU.
    // Если GPU не поддерживает AV1 NVENC (Ada+) — отключаем, чтобы не было
    // бесполезного fallback-цикла при каждом энкоде.
    const { getDb } = await import('./services/database')
    const db = getDb()
    const existingSettings = await db.settings.findUnique({ where: { id: 'default' }, select: { id: true } })
    if (!existingSettings) {
      await db.settings.create({
        data: { id: 'default', useGpu: gpuCap.supportsAv1 },
      })
      // Первый запуск — показать setup wizard для выбора папки библиотеки
      setNeedsSetup(true)
    }
  } catch (error) {
    console.error('[background] Ошибка seed профилей:', error)
  }

  // Показываем splash screen сразу
  createSplashWindow()

  // Настраиваем обработчик media:// протокола
  setupMediaProtocolHandler()

  // Инициализируем whitelist разрешённых путей для media:// протокола
  initAllowedPaths()

  // Регистрируем IPC handlers
  registerIpcHandlers()

  // Инициализируем обработку deep links (animatrona://)
  getDeepLinkService().initialize()

  // Настраиваем меню приложения
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Файл',
      submenu: [{ role: 'quit', label: 'Выход' }],
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload', label: 'Перезагрузить' },
        { role: 'forceReload', label: 'Принудительно перезагрузить' },
        { role: 'toggleDevTools', label: 'Инструменты разработчика' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Сбросить масштаб' },
        { role: 'zoomIn', label: 'Увеличить' },
        { role: 'zoomOut', label: 'Уменьшить' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полноэкранный режим' },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

  // Инициализируем Stats Tracker (отслеживание статистики IPFS)
  const statsTracker = getStatsTracker()
  statsTracker.initialize()

  // Инициализируем Reputation Service (расчёт репутации на основе stats)
  const reputationService = getReputationService()
  reputationService.initialize()

  // Инициализируем Achievement Service (проверка и разблокировка достижений)
  const achievementService = getAchievementService()
  achievementService.initialize()

  // Инициализируем Bonus Service (бонусные очки за раздачу)
  const bonusService = getBonusService()
  bonusService.initialize()

  // В production запускаем Next.js сервер
  if (isProd) {
    try {
      await startNextServer()
    } catch (err) {
      log.error('Failed to start Next.js server', { error: String(err) })

      // Показываем диалог пользователю
      const result = await dialog.showMessageBox({
        type: 'error',
        title: 'Ошибка запуска',
        message: 'Не удалось запустить сервер',
        detail:
          `Animatrona не смогла найти свободный порт для запуска.\n\nВозможные решения:\n• Закройте другие приложения\n• Перезагрузите компьютер\n• Проверьте антивирус/фаервол\n\nОшибка: ${err}`,
        buttons: ['Повторить', 'Выход'],
        defaultId: 0,
      })

      if (result.response === 0) {
        // Повторить попытку
        app.relaunch()
        app.quit()
      } else {
        app.quit()
      }
      return // Не продолжать загрузку
    }
  }

  // Создаём главное окно (splash закроется когда оно будет готово)
  const mainWindow = await createMainWindow()

  // Передаём mainWindow для отправки прогресса миграции библиотеки
  setMainWindowForMigration(mainWindow)

  // Инициализируем системный трей
  initTray(mainWindow, isProd)

  // Инициализируем автообновления
  initAutoUpdater(mainWindow)

  // Уведомляем renderer при сохранении прогресса просмотра с мобильного
  mobileProgressEvents.on('saved', ({ animeId, episodeId }: { animeId: string; episodeId: string }) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('mobile:progress-saved', { animeId, episodeId })
    }
  })

  // Читаем Settings для определения пути к библиотеке и IPFS хранилищу
  // Если libraryPath = null → первый запуск, renderer покажет setup wizard
  let kuboLibraryPath: string | null = null
  let kuboStorageMaxGb = 500
  try {
    const { getDb } = await import('./services/database')
    const db = getDb()
    const appSettings = await db.settings.findUnique({
      where: { id: 'default' },
      select: { libraryPath: true, ipfsStorageMaxGb: true },
    })
    kuboLibraryPath = appSettings?.libraryPath ?? null
    kuboStorageMaxGb = appSettings?.ipfsStorageMaxGb ?? 500
  } catch (err) {
    log.warn('Не удалось прочитать Settings для Kubo', { error: String(err) })
  }

  // Автозапуск IPFS при старте приложения (в фоне, не блокирует UI)
  // KuboService — основной для P2P/DHT (Go IPFS)
  const kuboService = getKuboService()

  // Автозапуск Kubo → Sync сервисы
  // Kubo запускается первым для стабильного P2P
  // Renderer обращается к Kubo gateway напрямую (без кастомного gateway-сервера)
  kuboService
    .initialize({ libraryPath: kuboLibraryPath, storageMaxGb: kuboStorageMaxGb })
    .then(async () => {
      log.info('Kubo started', {
        mode: kuboService.getMode(),
        peerId: kuboService.getPeerId()?.slice(-8),
        gatewayUrl: kuboService.getGatewayUrl(),
      })

      // Блокируем переход системы в режим энергосбережения пока IPFS работает
      // 'prevent-app-suspension' — не даёт Windows троттлить процесс
      ipfsPowerSaveBlockerId = powerSaveBlocker.start('prevent-app-suspension')
      log.info('PowerSaveBlocker started', { id: ipfsPowerSaveBlockerId })

      // Все sync-сервисы независимы друг от друга — запускаем параллельно
      // Каждый зависит только от Kubo, который уже инициализирован
      const syncServices = [
        { name: 'WatchProgressSync', init: () => getWatchProgressSync().initialize() },
        { name: 'UserProfileSync', init: () => getUserProfileSync().initialize() },
        { name: 'FriendRequestsSync', init: () => getFriendRequestsSync().initialize() },
        { name: 'PresenceSync', init: () => getPresenceSync().start() },
        { name: 'WatchPartySync', init: () => getWatchPartySync().initialize() },
        { name: 'DistributionService', init: () => getDistributionService().initialize() },
      ]

      const results = await Promise.allSettled(syncServices.map((s) => s.init()))

      for (const [i, result] of results.entries()) {
        const { name } = syncServices[i]
        if (result.status === 'fulfilled') {
          log.info(`${name} initialized`)
        } else {
          log.error(`${name} failed to initialize`, { error: String(result.reason) })
        }
      }

      // Авто-миграция legacy-аниме без directoryCid (одноразово после обновления)
      const { runLegacyDirectoryMigration } = await import('./services/legacy-directory-migration')
      await runLegacyDirectoryMigration().catch((err) => {
        log.error('Legacy directory migration failed', { error: String(err) })
      })
    })
    .catch((err) => {
      log.error('IPFS autostart failed', { error: String(err) })
      // Не критично — пользователь может запустить вручную
    })

  // Реакция на suspend/resume системы — переподключение IPFS после сна
  powerMonitor.on('suspend', () => {
    log.info('Система переходит в спящий режим')
  })

  powerMonitor.on('resume', () => {
    log.info('Система вышла из спящего режима — переподключение IPFS')
    kuboService.reconnect().catch((err) => {
      log.error('IPFS reconnect after resume failed', { error: String(err) })
    })
  })

  // Автозапуск мобильного сервера если был включён в настройках
  autoStartMobileServer()

  app.on('activate', async () => {
    // На macOS пересоздаём окно при клике на иконку в доке
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow()
    }
  })
})

// Выход на всех платформах кроме macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Расширяем тип app для флага isQuitting
declare module 'electron' {
  interface App {
    isQuitting?: boolean
  }
}

// Cleanup при выходе
app.on('before-quit', async () => {
  app.isQuitting = true

  // Останавливаем powerSaveBlocker для IPFS
  if (ipfsPowerSaveBlockerId !== null && powerSaveBlocker.isStarted(ipfsPowerSaveBlockerId)) {
    powerSaveBlocker.stop(ipfsPowerSaveBlockerId)
    log.info('PowerSaveBlocker stopped', { id: ipfsPowerSaveBlockerId })
    ipfsPowerSaveBlockerId = null
  }

  // Stats Tracker shutdown (сохраняет накопленную статистику)
  try {
    const statsTracker = getStatsTracker()
    statsTracker.shutdown()
    log.info('Stats Tracker stopped')
  } catch (err) {
    log.error('Stats Tracker shutdown error', { error: String(err) })
  }

  // Reputation Service shutdown
  try {
    const reputationService = getReputationService()
    reputationService.shutdown()
    log.info('Reputation Service stopped')
  } catch (err) {
    log.error('Reputation Service shutdown error', { error: String(err) })
  }

  // Achievement Service shutdown
  try {
    const achievementService = getAchievementService()
    achievementService.shutdown()
    log.info('Achievement Service stopped')
  } catch (err) {
    log.error('Achievement Service shutdown error', { error: String(err) })
  }

  // Bonus Service shutdown
  try {
    const bonusService = getBonusService()
    bonusService.shutdown()
    log.info('Bonus Service stopped')
  } catch (err) {
    log.error('Bonus Service shutdown error', { error: String(err) })
  }

  // Mobile Server shutdown
  try {
    const mobileServer = getMobileServer()
    if (mobileServer.getStatus().isRunning) {
      await mobileServer.stop()
      log.info('Mobile Server stopped')
    }
  } catch (err) {
    log.error('Mobile Server shutdown error', { error: String(err) })
  }

  // WatchProgressSync shutdown
  try {
    await getWatchProgressSync().shutdown()
    log.info('WatchProgressSync stopped')
  } catch (err) {
    log.error('WatchProgressSync shutdown error', { error: String(err) })
  }

  // UserProfileSync shutdown
  try {
    await getUserProfileSync().shutdown()
    log.info('UserProfileSync stopped')
  } catch (err) {
    log.error('UserProfileSync shutdown error', { error: String(err) })
  }

  // FriendRequestsSync shutdown
  try {
    await getFriendRequestsSync().shutdown()
    log.info('FriendRequestsSync stopped')
  } catch (err) {
    log.error('FriendRequestsSync shutdown error', { error: String(err) })
  }

  // PresenceSync shutdown
  try {
    await getPresenceSync().stop()
    log.info('PresenceSync stopped')
  } catch (err) {
    log.error('PresenceSync shutdown error', { error: String(err) })
  }

  // WatchPartySync shutdown
  try {
    await getWatchPartySync().shutdown()
    log.info('WatchPartySync stopped')
  } catch (err) {
    log.error('WatchPartySync shutdown error', { error: String(err) })
  }

  // DistributionService shutdown (уведомляет трекер о выходе, пока IPFS ещё работает)
  try {
    await getDistributionService().shutdown()
    log.info('DistributionService stopped')
  } catch (err) {
    log.error('DistributionService shutdown error', { error: String(err) })
  }

  // Kubo shutdown с таймаутом 5 сек
  const kuboService = getKuboService()
  if (kuboService.isRunning()) {
    try {
      log.info('Stopping Kubo...')
      await Promise.race([
        kuboService.shutdown(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Kubo shutdown timeout')), 5000)),
      ])
      log.info('Kubo stopped')
    } catch (err) {
      log.error('Kubo shutdown error', { error: String(err) })
    }
  }

  destroyTray()
  stopNextServer()
})

app.on('quit', () => {
  stopNextServer()
})

/**
 * Автозапуск мобильного сервера если включён в настройках
 * Вызывается при старте приложения после инициализации БД
 */
async function autoStartMobileServer(): Promise<void> {
  try {
    // Динамический импорт чтобы не тянуть Prisma до инициализации БД
    const { getDb } = await import('./services/database')
    const db = getDb()

    // Проверяем существует ли запись Settings
    let settings = await db.settings.findUnique({
      where: { id: 'default' },
      select: { mobileAccessEnabled: true, mobileServerPort: true },
    })

    // Создаём запись если не существует
    if (!settings) {
      log.info('Settings record not found, creating default')
      settings = await db.settings.create({
        data: { id: 'default' },
        select: { mobileAccessEnabled: true, mobileServerPort: true },
      })
    }

    log.info('Mobile server autostart check', {
      mobileAccessEnabled: settings.mobileAccessEnabled,
      mobileServerPort: settings.mobileServerPort,
    })

    if (!settings.mobileAccessEnabled) {
      log.info('Mobile server autostart disabled (setting is false)')
      return
    }

    const mobileServer = getMobileServer()
    const port = settings.mobileServerPort ?? 4000

    // Путь к статическим файлам mobile-ui
    const isProd = app.isPackaged
    const staticPath = isProd
      ? path.join(process.resourcesPath, 'mobile-ui')
      : path.join(app.getAppPath(), 'mobile-ui', 'dist')

    await mobileServer.start({ port, staticPath })

    log.info('Mobile server autostarted', { port, staticPath })
  } catch (err) {
    log.error('Mobile server autostart failed', { error: String(err) })
    // Не критично — пользователь может запустить вручную
  }
}
