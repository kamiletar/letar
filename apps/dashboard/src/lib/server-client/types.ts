/**
 * ServerClient Types
 * Типы для абстракции доступа к серверам (локальный/удалённый)
 */

// =============================================================================
// System Metrics
// =============================================================================

export interface CPUInfo {
  manufacturer: string
  brand: string
  cores: number
  physicalCores: number
  speed: string | number
  currentLoad: number
  avgLoad: number
  coresLoad?: Array<{
    load: number
    loadUser: number
    loadSystem: number
  }>
}

export interface MemoryInfo {
  total: number
  used: number
  free: number
  active: number
  available: number
  usedPercent?: number
}

export interface DiskInfo {
  fs: string
  type: string
  size: number
  used: number
  available: number
  use?: number
  usedPercent?: number
  mount: string
}

export interface NetworkInterface {
  iface: string
  ip4: string
  ip6: string
  mac: string
  internal?: boolean
  virtual?: boolean
  type?: string
}

export interface NetworkStats {
  iface: string
  operstate?: string
  rxBytes?: number
  txBytes?: number
  rxSec?: number
  txSec?: number
}

export interface NetworkInfo {
  interfaces: NetworkInterface[]
  stats: NetworkStats[]
}

export interface SystemUptime {
  uptime: number
  timezone: string
  timezoneName: string
}

// =============================================================================
// Docker
// =============================================================================

export interface Container {
  id: string
  names?: string[]
  name?: string
  image: string
  imageID?: string
  command?: string
  created: number
  state: string
  status: string
  ports: ContainerPort[]
  labels?: Record<string, string>
  mounts?: Array<{
    Type: string
    Source: string
    Destination: string
  }>
}

export interface ContainerPort {
  privatePort: number
  publicPort?: number
  type: string
}

export interface ContainerStats {
  cpuPercent?: string
  cpu?: number
  memoryUsage: number
  memoryLimit: number
  memoryPercent?: string
  memory?: number
  networkRx: number
  networkTx: number
  blockRead: number
  blockWrite: number
}

export interface ContainerMemory {
  id: string
  name: string
  memoryUsage: number
  memoryLimit: number
  memoryPercent: number
}

export interface AllContainersMemory {
  containers: ContainerMemory[]
  totalDockerMemory: number
  containerCount: number
}

// =============================================================================
// Docker Extended Types
// =============================================================================

export interface DockerImage {
  id: string
  repoTags: string[]
  repoDigests: string[]
  created: number
  size: number
  virtualSize: number
  labels: Record<string, string>
}

export interface DockerVolume {
  name: string
  driver: string
  mountpoint: string
  labels: Record<string, string>
  scope: string
  usageData?: {
    size: number
    refCount: number
  }
}

export interface DockerNetwork {
  id: string
  name: string
  driver: string
  scope: string
  internal: boolean
  containers: Record<string, { name: string; ipv4Address: string }>
}

// =============================================================================
// Database Types
// =============================================================================

export interface DatabaseContainerStatus {
  found: boolean
  running: boolean
  containerName: string
  containerId?: string
  state?: string
  status?: string
  created?: number
}

export interface DatabaseStatus {
  name: string
  containerStatus: DatabaseContainerStatus
  connectionOk: boolean
  host: string
  port: number
  database: string
}

export interface DatabaseStatsResult {
  name: string
  success: boolean
  stats?: {
    size: number
    connections: number
    tables: Array<{
      schemaname: string
      tablename: string
      size: number
      size_pretty: string
    }>
    version: string
  }
  error?: string
}

export interface BackupInfo {
  id: string
  dbName: string
  filename: string
  path: string
  size: number
  createdAt: string
  type: 'manual' | 'auto'
}

export interface BackupResult {
  name: string
  success: boolean
  file?: string
  size?: number
  duration?: number
  error?: string
}

export interface BackupResponse {
  results: BackupResult[]
  summary: { total: number; success: number; failed: number }
}

// =============================================================================
// Cron Types
// =============================================================================

export interface CronJob {
  id: string
  name: string
  app: string
  endpoint: string
  schedule: string
  description: string
  enabled: boolean
}

export interface CronExecutionLog {
  id: string
  jobId: string
  startedAt: Date
  completedAt: Date | null
  status: 'success' | 'error' | 'running'
  statusCode: number | null
  responseBody: string | null
  error: string | null
  duration: number | null
}

export interface CronJobStatus {
  job: CronJob
  lastRun: Date | null
  lastStatus: 'success' | 'error' | 'running' | null
  lastError: string | null
  lastDuration: number | null
  nextRun: Date | null
  isScheduled: boolean
}

export interface CronJobsResponse {
  isRunning: boolean
  scheduledCount: number
  totalCount: number
  jobs: CronJobStatus[]
}

// =============================================================================
// Git Types
// =============================================================================

export interface GitStatus {
  /** Текущая ветка */
  current: string
  /** Репозиторий чистый (нет изменений) */
  isClean: boolean
  /** Изменённые файлы */
  modified: string[]
  /** Новые файлы (untracked) */
  created: string[]
  /** Удалённые файлы */
  deleted: string[]
  /** Коммитов впереди remote */
  ahead: number
  /** Коммитов позади remote */
  behind: number
}

export interface GitCommit {
  /** Полный хеш коммита */
  hash: string
  /** Короткий хеш (7 символов) */
  shortHash: string
  /** Сообщение коммита */
  message: string
  /** Автор */
  author: string
  /** Дата коммита */
  date: string
}

export interface GitStatusResult {
  status: GitStatus
  currentCommit: GitCommit
}

export interface GitIncomingResult {
  count: number
  commits: GitCommit[]
}

export interface GitPullResult {
  success: boolean
  upToDate: boolean
  output: string
}

/** API-обёртка для GET /api/servers/:id/git/status */
export interface GitStatusResponse {
  success: boolean
  status?: GitStatus
  currentCommit?: GitCommit
  error?: string
}

/** API-обёртка для GET /api/servers/:id/git/incoming */
export interface GitIncomingResponse {
  success: boolean
  count?: number
  commits?: GitCommit[]
  error?: string
}

// =============================================================================
// Server Client Interface
// =============================================================================

export interface ServerClient {
  // System
  getCPUInfo(): Promise<CPUInfo>
  getMemoryInfo(): Promise<MemoryInfo>
  getDiskInfo(): Promise<DiskInfo[]>
  getNetworkInfo(): Promise<NetworkInfo>
  getSystemUptime(): Promise<SystemUptime>

  // Docker — Containers
  getContainers(all?: boolean): Promise<Container[]>
  getContainerStats(containerId: string): Promise<ContainerStats>
  getAllContainersMemory(): Promise<AllContainersMemory>
  controlContainer(containerId: string, action: 'start' | 'stop' | 'restart'): Promise<void>
  getContainerLogs(containerId: string, tail?: number): Promise<{ stdout: string; stderr: string }>

  // Docker — Resources
  getImages(): Promise<DockerImage[]>
  getVolumes(): Promise<DockerVolume[]>
  getNetworks(): Promise<DockerNetwork[]>

  // Docker — Deploy
  pullImage(imageName: string): Promise<void>

  // Database
  getDatabaseStatus(): Promise<DatabaseStatus[]>
  getDatabaseStats(dbName?: string): Promise<DatabaseStatsResult[]>
  getBackups(dbName?: string): Promise<BackupInfo[]>
  createBackup(dbName?: string): Promise<BackupResponse>

  // Cron
  getCronJobs(): Promise<CronJobsResponse>
  controlCronScheduler(action: 'start' | 'stop'): Promise<{ message: string; isRunning: boolean }>
  getCronJobStatus(jobId: string): Promise<CronJobStatus>
  updateCronJob(jobId: string, updates: Partial<CronJob>): Promise<{ job: CronJob }>
  runCronJob(jobId: string): Promise<{ result: CronExecutionLog }>
  getCronJobHistory(
    jobId: string,
    limit?: number,
  ): Promise<{ jobId: string; jobName: string; logs: CronExecutionLog[] }>

  // Health
  isAvailable(): Promise<boolean>

  // Git (опционально — только для удалённых серверов с dashboard-agent)
  getGitStatus?(): Promise<GitStatusResult>
  getGitIncoming?(): Promise<GitIncomingResult>
  gitPull?(): Promise<GitPullResult>

  // Deploy (опционально — только для удалённых серверов с dashboard-agent)
  deployApp?(appName: string): Promise<{ appName: string; started: boolean }>
  cancelDeploy?(): Promise<{ cancelled: boolean }>
  getDeployStatus?(): Promise<{
    running: boolean
    action?: string
    startTime?: string
    output: string[]
    error?: string
  }>
}

// =============================================================================
// Server Info
// =============================================================================

export interface ServerInfo {
  id: string
  name: string
  displayName: string
  host: string
  port: number
  isLocal: boolean
  isActive: boolean
  agentToken?: string | null
  lastSeen?: Date | null
  // NPM credentials (пароль не возвращается из API)
  npmUrl?: string | null
  npmEmail?: string | null
}
