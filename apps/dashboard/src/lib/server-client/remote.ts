/**
 * RemoteServerClient
 * HTTP клиент для получения метрик с удалённого сервера через dashboard-agent
 */

import type {
  AllContainersMemory,
  BackupInfo,
  BackupResponse,
  Container,
  ContainerStats,
  CPUInfo,
  CronExecutionLog,
  CronJob,
  CronJobsResponse,
  CronJobStatus,
  DatabaseStatsResult,
  DatabaseStatus,
  DiskInfo,
  DockerImage,
  DockerNetwork,
  DockerVolume,
  GitIncomingResult,
  GitPullResult,
  GitStatusResult,
  MemoryInfo,
  NetworkInfo,
  ServerClient,
  ServerInfo,
  SystemUptime,
} from './types'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export class RemoteServerClient implements ServerClient {
  private baseUrl: string
  private token: string
  private timeout: number

  constructor(server: ServerInfo, timeout = 10000) {
    this.baseUrl = `http://${server.host}:${server.port}`
    this.token = server.agentToken || ''
    this.timeout = timeout
  }

  private async fetch<T>(path: string, options?: RequestInit & { timeout?: number }): Promise<T> {
    const controller = new AbortController()
    const timeout = options?.timeout ?? this.timeout
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
          ...options?.headers,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const json: ApiResponse<T> = await response.json()

      if (!json.success) {
        throw new Error(json.error || 'Unknown error')
      }

      return json.data!
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // ===========================================================================
  // System
  // ===========================================================================

  async getCPUInfo(): Promise<CPUInfo> {
    return this.fetch<CPUInfo>('/api/system/cpu')
  }

  async getMemoryInfo(): Promise<MemoryInfo> {
    return this.fetch<MemoryInfo>('/api/system/memory')
  }

  async getDiskInfo(): Promise<DiskInfo[]> {
    return this.fetch<DiskInfo[]>('/api/system/disk')
  }

  async getNetworkInfo(): Promise<NetworkInfo> {
    return this.fetch<NetworkInfo>('/api/system/network')
  }

  async getSystemUptime(): Promise<SystemUptime> {
    return this.fetch<SystemUptime>('/api/system/uptime')
  }

  async getTopProcesses(
    limit = 20,
  ): Promise<{ pid: number; name: string; cpu: number; mem: number; memRss: number }[]> {
    return this.fetch(`/api/system/processes?limit=${limit}`)
  }

  async getSystemHistory(hours: number): Promise<unknown> {
    return this.fetch(`/api/system/history?hours=${hours}`)
  }

  async getDockerDiskUsage(): Promise<{
    images: { total: number; size: number }
    containers: { total: number; size: number }
    volumes: { total: number; size: number }
    buildCache: { total: number; size: number }
  }> {
    return this.fetch('/api/docker/disk-usage')
  }

  async dockerPrune(type: 'buildCache' | 'images' | 'system'): Promise<{ spaceReclaimed: number; message: string }> {
    return this.fetch('/api/docker/prune', {
      method: 'POST',
      body: JSON.stringify({ type }),
      timeout: 120000, // 2 минуты — Docker prune может занимать долго
    })
  }

  // ===========================================================================
  // Docker
  // ===========================================================================

  async getContainers(all = true): Promise<Container[]> {
    return this.fetch<Container[]>(`/api/docker/containers?all=${all}`)
  }

  async getContainerStats(containerId: string): Promise<ContainerStats> {
    return this.fetch<ContainerStats>(`/api/docker/containers/${containerId}/stats`)
  }

  async getAllContainersMemory(): Promise<AllContainersMemory> {
    return this.fetch<AllContainersMemory>('/api/docker/containers/memory')
  }

  async controlContainer(containerId: string, action: 'start' | 'stop' | 'restart'): Promise<void> {
    await this.fetch<{ message: string }>(`/api/docker/containers/${containerId}/control`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
  }

  async getContainerLogs(containerId: string, tail = 100): Promise<{ stdout: string; stderr: string }> {
    return this.fetch<{ stdout: string; stderr: string }>(`/api/docker/containers/${containerId}/logs?tail=${tail}`)
  }

  // ===========================================================================
  // Docker — Resources
  // ===========================================================================

  async getImages(): Promise<DockerImage[]> {
    return this.fetch<DockerImage[]>('/api/docker/images')
  }

  async getVolumes(): Promise<DockerVolume[]> {
    return this.fetch<DockerVolume[]>('/api/docker/volumes')
  }

  async getNetworks(): Promise<DockerNetwork[]> {
    return this.fetch<DockerNetwork[]>('/api/docker/networks')
  }

  // ===========================================================================
  // Docker — Deploy
  // ===========================================================================

  async pullImage(imageName: string): Promise<void> {
    await this.fetch<{ message: string }>('/api/docker/images/pull', {
      method: 'POST',
      body: JSON.stringify({ imageName }),
    })
  }

  /**
   * Запуск деплоя приложения через deploy-affected.sh
   * Возвращает сразу после запуска, логи приходят через getDeployStatus()
   */
  async deployApp(appName: string): Promise<{ appName: string; started: boolean }> {
    return this.fetch<{ appName: string; started: boolean }>('/api/deploy/app', {
      method: 'POST',
      body: JSON.stringify({ appName }),
      timeout: 30000, // 30 секунд для запуска
    })
  }

  /**
   * Отмена текущего деплоя
   */
  async cancelDeploy(): Promise<{ cancelled: boolean }> {
    return this.fetch<{ cancelled: boolean }>('/api/deploy/cancel', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  // ===========================================================================
  // Database
  // ===========================================================================

  async getDatabaseStatus(): Promise<DatabaseStatus[]> {
    return this.fetch<DatabaseStatus[]>('/api/database/status')
  }

  async getDatabaseStats(dbName?: string): Promise<DatabaseStatsResult[]> {
    const url = dbName ? `/api/database/stats?db=${encodeURIComponent(dbName)}` : '/api/database/stats'
    return this.fetch<DatabaseStatsResult[]>(url)
  }

  async getBackups(dbName?: string): Promise<BackupInfo[]> {
    const url = dbName ? `/api/database/backups?db=${encodeURIComponent(dbName)}` : '/api/database/backups'
    return this.fetch<BackupInfo[]>(url)
  }

  async createBackup(dbName?: string): Promise<BackupResponse> {
    const url = dbName ? `/api/database/backup?db=${encodeURIComponent(dbName)}` : '/api/database/backup'
    return this.fetch<BackupResponse>(url, { method: 'POST' })
  }

  // ===========================================================================
  // Cron
  // ===========================================================================

  async getCronJobs(): Promise<CronJobsResponse> {
    return this.fetch<CronJobsResponse>('/api/cron/jobs')
  }

  async controlCronScheduler(action: 'start' | 'stop'): Promise<{ message: string; isRunning: boolean }> {
    return this.fetch<{ message: string; isRunning: boolean }>('/api/cron/jobs', {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
  }

  async getCronJobStatus(jobId: string): Promise<CronJobStatus> {
    return this.fetch<CronJobStatus>(`/api/cron/jobs/${encodeURIComponent(jobId)}`)
  }

  async updateCronJob(jobId: string, updates: Partial<CronJob>): Promise<{ job: CronJob }> {
    return this.fetch<{ job: CronJob }>(`/api/cron/jobs/${encodeURIComponent(jobId)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
  }

  async runCronJob(jobId: string): Promise<{ result: CronExecutionLog }> {
    return this.fetch<{ result: CronExecutionLog }>(`/api/cron/jobs/${encodeURIComponent(jobId)}/run`, {
      method: 'POST',
    })
  }

  async getCronJobHistory(
    jobId: string,
    limit = 20,
  ): Promise<{ jobId: string; jobName: string; logs: CronExecutionLog[] }> {
    return this.fetch<{ jobId: string; jobName: string; logs: CronExecutionLog[] }>(
      `/api/cron/jobs/${encodeURIComponent(jobId)}/history?limit=${limit}`,
    )
  }

  // ===========================================================================
  // Health
  // ===========================================================================

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.baseUrl}/health`, {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return false
      }

      const json = await response.json()
      return json.status === 'ok'
    } catch {
      return false
    }
  }

  // ===========================================================================
  // Git
  // ===========================================================================

  async getGitStatus(): Promise<GitStatusResult> {
    return this.fetch<GitStatusResult>('/api/git/status')
  }

  async getGitIncoming(): Promise<GitIncomingResult> {
    return this.fetch<GitIncomingResult>('/api/git/incoming')
  }

  async gitPull(): Promise<GitPullResult> {
    return this.fetch<GitPullResult>('/api/git/pull', {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  // ===========================================================================
  // Deploy Status
  // ===========================================================================

  /**
   * Получить текущий статус деплоя с agent
   */
  async getDeployStatus(): Promise<{
    running: boolean
    action?: string
    startTime?: string
    output: string[]
    error?: string
  }> {
    return this.fetch('/api/deploy/status')
  }
}
