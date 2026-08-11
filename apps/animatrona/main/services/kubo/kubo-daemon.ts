/**
 * Управление Kubo демоном — бинарник, spawn, init, конфигурация портов
 *
 * Все функции stateless — принимают необходимые параметры и возвращают результат.
 * Состояние (процесс, порты) хранится в KuboService (фасад).
 */

import { type ChildProcess, spawn } from 'child_process'
import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

import { createModuleLogger } from '../../utils/logger'
import { getAvailablePort } from '../../utils/port-finder'
import { KUBO_CONFIG, KUBO_PORTS } from './kubo-config'
import type { KuboCurrentPorts } from './kubo-types'
import { getPeerSyncService } from './peer-sync-service'
import type { PinServer } from './peer-sync-types'

// Helper для фильтрации публичных libp2p bootstrap нод
function isPublicLibp2pBootstrap(addr: string, syncedServers: PinServer[]): boolean {
  const syncedPeerIds = new Set(syncedServers.map((s) => s.peerId))
  const match = /\/p2p\/([^/]+)$/.exec(addr)
  if (!match) {
    return false
  }
  const peerId = match[1]
  return !syncedPeerIds.has(peerId)
}

const log = createModuleLogger('KuboDaemon')

/**
 * Получить путь к бинарнику Kubo
 */
export function getKuboBinaryPath(): string {
  const isProd = app.isPackaged

  // Определяем имя бинарника
  const binName = process.platform === 'win32' ? 'kubo.exe' : 'kubo'

  // Определяем папку платформы
  const getPlatformFolder = (): string => {
    if (process.platform === 'win32') {
      return 'win'
    }
    if (process.platform === 'linux') {
      return 'linux'
    }
    if (process.platform === 'darwin') {
      // macOS: разные бинарники для x64 и arm64
      return process.arch === 'arm64' ? 'darwin-arm64' : 'darwin'
    }
    return 'linux' // fallback
  }

  if (isProd) {
    // В production — в extraResources/kubo/<platform>/
    return path.join(process.resourcesPath, 'kubo', getPlatformFolder(), binName)
  } else {
    // В dev — в resources/kubo/<platform>/
    return path.join(app.getAppPath(), 'resources', 'kubo', getPlatformFolder(), binName)
  }
}

/**
 * Получить путь к репозиторию Kubo.
 * Если задан libraryPath — IPFS хранится как подпапка библиотеки ({libraryPath}/ipfs).
 * Для существующих пользователей без libraryPath — legacy путь userData/kubo-repo.
 */
export function getKuboRepoPath(libraryPath?: string | null): string {
  if (libraryPath) {
    return path.join(libraryPath, 'ipfs')
  }
  return path.join(app.getPath('userData'), 'kubo-repo')
}

/**
 * Проверить что бинарник Kubo существует
 */
export async function validateKuboBinary(kuboBin: string): Promise<void> {
  try {
    await fs.access(kuboBin)
    const stat = await fs.stat(kuboBin)
    log.info('Kubo бинарник найден', { size: stat.size })
  } catch (err) {
    log.error('Kubo бинарник не найден', { kuboBin, error: String(err) })
    throw new Error(`Kubo бинарник не найден: ${kuboBin}\n` + 'Запустите: npx tsx scripts/download-kubo.ts', {
      cause: err,
    })
  }
}

/**
 * Инициализировать Kubo репозиторий (если ещё не создан)
 */
export async function initKuboRepo(kuboBin: string, repoPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const initProcess = spawn(kuboBin, ['init', '--repo-dir', repoPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stderr = ''

    initProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    initProcess.on('close', (code: number | null) => {
      if (code === 0) {
        log.info('Kubo репозиторий инициализирован')
        resolve()
      } else {
        reject(new Error(`Kubo init failed with code ${code}: ${stderr}`))
      }
    })

    initProcess.on('error', reject)
  })
}

/**
 * Найти свободные порты для Kubo (если дефолтные заняты)
 */
export async function findFreePorts(): Promise<KuboCurrentPorts> {
  log.info('Ищу свободные порты для Kubo...', { defaults: KUBO_PORTS })

  const api = await getAvailablePort(KUBO_PORTS.api)
  const gateway = await getAvailablePort(KUBO_PORTS.gateway)
  const swarmTcp = await getAvailablePort(KUBO_PORTS.swarmTcp)

  const ports: KuboCurrentPorts = {
    api,
    gateway,
    swarmTcp,
    swarmQuic: swarmTcp, // QUIC использует тот же порт (UDP)
  }

  const changed = api !== KUBO_PORTS.api || gateway !== KUBO_PORTS.gateway || swarmTcp !== KUBO_PORTS.swarmTcp

  if (changed) {
    log.info('Используются альтернативные порты', { currentPorts: ports })
  } else {
    log.info('Используются дефолтные порты')
  }

  return ports
}

/**
 * Выполнить одну команду Kubo CLI
 */
export function runKuboCommand(kuboBin: string, repoPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(kuboBin, ['--repo-dir', repoPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve()
      } else {
        log.warn('Kubo config command failed (non-fatal)', { args, code, stderr: stderr.trim() })
        // Не reject — некоторые команды могут не работать на старых репо
        resolve()
      }
    })

    proc.on('error', reject)
  })
}

/**
 * Применить конфигурацию Kubo (порты, bootstrap peers)
 */
export async function applyKuboConfig(
  kuboBin: string,
  repoPath: string,
  ports: KuboCurrentPorts,
  storageMaxGb = 500,
): Promise<void> {
  // Формируем Swarm адреса с текущими портами
  const swarmAddresses = [
    `/ip4/0.0.0.0/tcp/${ports.swarmTcp}`,
    `/ip4/0.0.0.0/udp/${ports.swarmQuic}/quic-v1`,
    `/ip4/0.0.0.0/udp/${ports.swarmQuic}/quic-v1/webtransport`,
  ]

  // Подтягиваем актуальный список peers из tracker API (с fallback на cache → hardcoded)
  // ВАЖНО: sync выполняется ДО запуска daemon, чтобы конфиг сразу содержал актуальный Bootstrap/Peering
  const peerSync = getPeerSyncService()
  const syncResponse = await peerSync.fetchAndCache()

  // Строим Bootstrap и Peering из ответа API
  const syncedBootstrap: string[] = []
  const syncedPeering: Array<{ ID: string; Addrs: string[] }> = []

  for (const server of syncResponse.servers) {
    if (server.peeringRole === 'bootstrap' || server.peeringRole === 'both') {
      syncedBootstrap.push(...server.multiaddrs)
    }
    // Relay исключаем из Peering (управляется через StaticRelays, см. комментарий выше)
    if ((server.peeringRole === 'peering' || server.peeringRole === 'both') && server.role !== 'relay') {
      syncedPeering.push({ ID: server.peerId, Addrs: server.multiaddrs })
    }
  }

  // Добавляем публичные libp2p bootstrap ноды (из hardcoded fallback)
  const publicBootstrapNodes = KUBO_CONFIG.Bootstrap.filter(
    (addr: string) =>
      addr.startsWith('/dnsaddr/bootstrap.libp2p.io') || isPublicLibp2pBootstrap(addr, syncResponse.servers),
  )

  const finalBootstrap = [...syncedBootstrap, ...publicBootstrapNodes]

  // Gateway (s2) списан с июня 2026 (PLAN-INFRA.md §57) — раньше здесь форсировался
  // хардкод-коннект к мёртвому хосту на каждом старте демона, до автоочистки reconnect-циклом.

  const finalPeering = { Peers: syncedPeering }

  log.info('Kubo config: peers подтянуты', {
    source: peerSync.getStatus().source,
    bootstrapCount: finalBootstrap.length,
    peeringCount: syncedPeering.length,
  })

  const configCommands = [
    // API адрес
    ['config', 'Addresses.API', `/ip4/127.0.0.1/tcp/${ports.api}`],
    // Gateway адрес
    ['config', 'Addresses.Gateway', `/ip4/127.0.0.1/tcp/${ports.gateway}`],
    // Swarm адреса (JSON массив)
    ['config', 'Addresses.Swarm', '--json', JSON.stringify(swarmAddresses)],
    // PubSub
    ['config', 'Pubsub.Enabled', '--bool', 'true'],
    // RelayClient
    ['config', 'Swarm.RelayClient.Enabled', '--bool', 'true'],
    // Hole Punching
    ['config', 'Swarm.EnableHolePunching', '--bool', 'true'],
    // Лимит хранилища — дефолт 10GB слишком мало для аниме-библиотеки
    ['config', 'Datastore.StorageMax', `${storageMaxGb}GB`],
    // GC раз в 48 часов вместо дефолтного 1h — снижает нагрузку на CPU
    ['config', 'Datastore.GCPeriod', '48h'],
    // ConnMgr — высокие лимиты для AcceleratedDHTClient burst (700-1500 peers за 30с)
    // Relay monitor восстановит reservation если ConnMgr всё-таки прунит relay-connection
    [
      'config',
      'Swarm.ConnMgr',
      '--json',
      JSON.stringify({ Type: 'basic', LowWater: 600, HighWater: 1200, GracePeriod: '60s' }),
    ],
    // ResourceMgr — включён, лимиты через overrides файл
    ['config', 'Swarm.ResourceMgr.Enabled', '--bool', 'true'],
    // AcceleratedDHTClient ОТКЛЮЧЁН на десктоп-клиенте: создаёт 700-1500 соединений
    // и full DHT crawl каждые ~10-30 минут → периодические CPU-спайки.
    // Поиск контента работает через HTTP routers (delegated routing) и Peering.
    ['config', 'Routing.AcceleratedDHTClient', '--bool', 'false'],
    // Routing.Type "autoclient" — auto с HTTP routers, но всегда DHT client
    // "auto" переключается на server когда hole-punch работает → AutoRelay отключается
    // "autoclient" гарантирует что нода считается private → AutoRelay запрашивает relay reservation
    ['config', 'Routing.Type', 'autoclient'],
    // Provide Sweep — анонс ТОЛЬКО корневых CID каждого аниме (directoryCid).
    // Strategy 'roots' = N корневых CIDs (303 на 303 аниме), не миллионы дочерних блоков.
    // Дочерние блоки защищены рекурсивным пином и доступны через DHT-обнаружение root'а.
    // Это критично снижает startup-нагрузку на SSD (Kubo больше не обходит весь DAG).
    [
      'config',
      'Provide',
      '--json',
      JSON.stringify({ Strategy: 'roots', DHT: { SweepEnabled: true, ResumeEnabled: true } }),
    ],
    // StaticRelays — приватный relay для circuit relay между клиентами за NAT
    ['config', 'Swarm.RelayClient.StaticRelays', '--json', JSON.stringify(KUBO_CONFIG.Swarm.RelayClient.StaticRelays)],
    // RelayService отключён — мы клиент, не relay
    ['config', 'Swarm.RelayService.Enabled', '--bool', 'false'],
    // Bootstrap — приоритет подтянутым из API pin-серверам + публичные libp2p ноды
    ['config', 'Bootstrap', '--json', JSON.stringify(finalBootstrap)],
    // Peering — постоянные соединения с pin-серверами из API (relay в StaticRelays)
    ['config', 'Peering', '--json', JSON.stringify(finalPeering)],
    // mDNS отключён — не нужен для DHT discovery
    ['config', 'Discovery.MDNS.Enabled', '--bool', 'false'],
    // Принудительно считаем ноду private — гарантирует relay reservation
    // Без этого AutoNAT может решить что hole punching работает и relay не нужен,
    // но relay критичен для обмена контентом между клиентами за NAT
    ['config', 'Internal.Libp2pForceReachability', 'private'],
  ]

  for (const args of configCommands) {
    await runKuboCommand(kuboBin, repoPath, args)
  }

  // Прямой JSON-патч для полей которые не принимаются через CLI
  // (Kubo CLI игнорирует некоторые namespace без ошибки — нужна прямая запись)
  await patchConfigJson(repoPath, {
    'Swarm.RelayClient.StaticRelays': KUBO_CONFIG.Swarm.RelayClient.StaticRelays,
    // Принудительно считаем ноду private — гарантирует relay reservation
    // Без этого AutoNAT может решить что hole punching работает и relay не нужен,
    // но relay критичен для обмена контентом между клиентами за NAT
    'Internal.Libp2pForceReachability': 'private',
    // autoclient гарантирует что нода считается private → AutoRelay запрашивает relay reservation
    // "auto" переключается на server при успешном hole-punch → AutoRelay отключается
    'Routing.Type': 'autoclient',
    // ОТКЛЮЧЕНО: AcceleratedDHTClient жрал CPU full-crawl'ом каждые 10-30 минут.
    'Routing.AcceleratedDHTClient': false,
    // Provide.Strategy 'roots' — анонсируем только корневые CID (один на аниме).
    // Дочерние блоки реcurрsively pinned, доступны через DHT-обнаружение root'а.
    // 'pinned' заставлял Kubo обходить весь DAG при старте (5-10 мин GB/s read SSD).
    'Provide.Strategy': 'roots',
  })

  // Удаляем устаревшие Reprovider.* поля — в Kubo 0.40+ они заменены на Provide.*
  // и могут вызвать конфликт/падение демона если установлены оба.
  await removeLegacyReproviderConfig(repoPath)

  // Создаём libp2p resource limit overrides для высокой пропускной способности
  await writeResourceLimitOverrides(repoPath)

  // Верификация — логируем итоговые значения для диагностики
  await verifyKuboConfig(repoPath)

  log.info('Kubo конфигурация применена')
}

/**
 * Установить вложенное поле по dot-notation пути (мутирует obj)
 */
function setNestedField(obj: Record<string, unknown>, dotPath: string, value: unknown): void {
  const keys = dotPath.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {}
    }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]!] = value
}

/**
 * Удалить устаревшие Reprovider.* поля из config — в Kubo 0.40+ они заменены на Provide.*.
 * Если оставить, демон может крашиться или поведение становится непредсказуемым.
 */
async function removeLegacyReproviderConfig(repoPath: string): Promise<void> {
  const configPath = path.join(repoPath, 'config')
  try {
    const raw = await fs.readFile(configPath, 'utf8')
    const config = JSON.parse(raw) as Record<string, unknown>
    if ('Reprovider' in config) {
      delete config.Reprovider
      await fs.writeFile(configPath, JSON.stringify(config, null, 2))
      log.info('Удалена устаревшая секция Reprovider из Kubo config (Kubo 0.40+ использует Provide)')
    }
  } catch (err) {
    log.warn('Не удалось удалить Reprovider из config', { error: String(err) })
  }
}

/**
 * Прямой JSON-патч config файла Kubo
 *
 * Некоторые поля Kubo не принимаются через CLI (Internal.*, вложенные RelayClient.StaticRelays).
 * Вызывается пока daemon не запущен — безопасно читать/писать напрямую.
 */
async function patchConfigJson(repoPath: string, patches: Record<string, unknown>): Promise<void> {
  const configPath = path.join(repoPath, 'config')
  const raw = await fs.readFile(configPath, 'utf8')
  const config = JSON.parse(raw) as Record<string, unknown>

  for (const [dotPath, value] of Object.entries(patches)) {
    setNestedField(config, dotPath, value)
  }

  await fs.writeFile(configPath, JSON.stringify(config, null, 2))
  log.info('Kubo config JSON-патч применён', { fields: Object.keys(patches) })
}

/**
 * Верификация применённого конфига — логирует ключевые значения для диагностики
 */
async function verifyKuboConfig(repoPath: string): Promise<void> {
  const configPath = path.join(repoPath, 'config')
  const raw = await fs.readFile(configPath, 'utf8')
  const config = JSON.parse(raw) as Record<string, unknown>

  const swarm = config.Swarm as Record<string, unknown> | undefined
  const relayClient = swarm?.RelayClient as Record<string, unknown> | undefined
  const internal = config.Internal as Record<string, unknown> | undefined
  const routing = config.Routing as Record<string, unknown> | undefined
  const peering = config.Peering as { Peers?: unknown[] } | undefined

  log.info('Kubo config verification', {
    staticRelays: relayClient?.StaticRelays,
    forceReachability: internal?.Libp2pForceReachability,
    routingType: routing?.Type,
    acceleratedDHT: routing?.AcceleratedDHTClient,
    peeringCount: peering?.Peers?.length ?? 0,
  })
}

/**
 * Создать/обновить libp2p-resource-limit-overrides.json в Kubo репозитории
 * Kubo 0.19+ не принимает ResourceMgr.Limits в конфиге — нужен отдельный файл
 */
async function writeResourceLimitOverrides(repoPath: string): Promise<void> {
  const overridesPath = path.join(repoPath, 'libp2p-resource-limit-overrides.json')
  const overrides = {
    // Системные лимиты — высокие для AcceleratedDHTClient + раздачи
    System: {
      ConnsInbound: 2048,
      ConnsOutbound: 4096,
      Conns: 6144,
      StreamsInbound: 8192,
      StreamsOutbound: 16384,
      Streams: 24576,
      FD: 8192,
      // 4 GB для libp2p (AcceleratedDHTClient активно использует память)
      Memory: 4294967296,
    },
    ServiceDefault: {
      StreamsInbound: 4096,
      StreamsOutbound: 8192,
      Streams: 12288,
    },
    // DHT crawler — основной потребитель ресурсов при AcceleratedDHTClient
    Services: {
      'libp2p.dht-crawler': {
        StreamsInbound: 4096,
        StreamsOutbound: 8192,
        Streams: 12288,
        Memory: 1073741824, // 1 GB для DHT routing table
      },
    },
  }
  await fs.writeFile(overridesPath, JSON.stringify(overrides, null, 2))
  log.info('libp2p resource limit overrides записаны', { path: overridesPath })
}

/**
 * Запустить Kubo демон и дождаться готовности
 *
 * @returns ChildProcess запущенного демона
 */
export function spawnKuboDaemon(kuboBin: string, repoPath: string): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    log.info('Spawning Kubo daemon...', { kuboBin, repoPath })

    // --migrate=true автоматически мигрирует репозиторий при обновлении версии Kubo
    const kuboProcess = spawn(kuboBin, ['daemon', '--repo-dir', repoPath, '--migrate=true'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      // Detach чтобы процесс не был привязан к родителю
      detached: false,
      // На Windows важно скрыть окно консоли
      windowsHide: true,
      env: {
        ...process.env,
        // Debug для autorelay диагностики — видеть ошибки reservation
        GOLOG_LOG_LEVEL: 'autorelay=debug',
      },
    })

    let stdoutBuffer = ''
    let stderrBuffer = ''
    let resolved = false

    // Таймаут на запуск — 30 секунд
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        log.error('Kubo daemon startup timeout', { stdout: stdoutBuffer, stderr: stderrBuffer })
        kuboProcess.kill()
        reject(new Error('Kubo daemon startup timeout (30s)'))
      }
    }, 30000)

    kuboProcess.stdout?.on('data', (data: Buffer) => {
      const text = data.toString()
      stdoutBuffer += text
      // Логируем каждую строку отдельно для читаемости
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (trimmed) {
          log.debug(`Kubo: ${trimmed}`)
        }
      }

      // Ищем сигнал готовности
      if (text.includes('Daemon is ready')) {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          log.info('Kubo daemon is ready!')
          resolve(kuboProcess)
        }
      }
    })

    kuboProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString()
      stderrBuffer += text
      // Логируем каждую строку stderr отдельно
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) {
          continue
        }
        // ERROR/FATAL/PANIC/Error: — гарантированно видны
        if (
          /\b(ERROR|FATAL|PANIC|panic|fatal error|Error:)\b/.test(trimmed)
          || trimmed.includes('failed to')
          || trimmed.includes('error:')
        ) {
          log.error(`Kubo stderr: ${trimmed}`)
        } else if (trimmed.includes('autorelay') || trimmed.includes('failed to reserve')) {
          // AutoRelay диагностика
          log.warn(`Kubo stderr: ${trimmed}`)
        } else {
          log.debug(`Kubo stderr: ${trimmed}`)
        }
      }
    })

    kuboProcess.on('error', (error: Error) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        log.error('Kubo process error', { error: String(error) })
        reject(error)
      }
    })

    kuboProcess.on('close', (code: number | null) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        // Полный буфер stderr/stdout на отдельных error-логах для диагностики краша
        log.error('Kubo daemon exited unexpectedly', { code })
        if (stdoutBuffer.trim()) {
          log.error('Kubo stdout (full)', { stdout: stdoutBuffer.slice(0, 4000) })
        }
        if (stderrBuffer.trim()) {
          log.error('Kubo stderr (full)', { stderr: stderrBuffer.slice(0, 4000) })
        }
        reject(new Error(`Kubo daemon exited with code ${code}`))
      }
    })
  })
}

/**
 * Подготовить Kubo репозиторий — проверить/создать, найти порты, применить конфиг
 *
 * @returns Найденные свободные порты
 */
export async function prepareKuboRepo(
  kuboBin: string,
  repoPath: string,
  storageMaxGb = 500,
): Promise<KuboCurrentPorts> {
  await fs.mkdir(repoPath, { recursive: true })
  log.info('Kubo repo path', { repoPath })

  // Инициализируем репозиторий если его нет, или пересоздаём если config повреждён
  const configPath = path.join(repoPath, 'config')
  let configExists = false
  try {
    await fs.access(configPath)
    configExists = true
  } catch {
    // config не существует
  }

  if (configExists) {
    // Проверяем что config не повреждён — при переполнении диска запись обрывается посередине
    try {
      const raw = await fs.readFile(configPath, 'utf8')
      JSON.parse(raw)
      log.info('Kubo репозиторий уже существует')
    } catch (err) {
      // SyntaxError → файл урезан. Удаляем только config (keystore не трогаем → peer ID тот же)
      log.warn('Kubo config повреждён (переполнение диска?), пересоздаю config...', { error: String(err) })
      await fs.rm(configPath, { force: true })
      await initKuboRepo(kuboBin, repoPath)
    }
  } else {
    log.info('Инициализирую новый Kubo репозиторий...')
    await initKuboRepo(kuboBin, repoPath)
  }

  // Ищем свободные порты (если дефолтные заняты)
  const ports = await findFreePorts()

  // Применяем конфигурацию (порты, bootstrap peers и т.д.)
  await applyKuboConfig(kuboBin, repoPath, ports, storageMaxGb)

  return ports
}
