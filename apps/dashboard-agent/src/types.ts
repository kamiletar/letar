/**
 * Dashboard Agent Types
 * Типы для API агента мониторинга
 */

// =============================================================================
// System Metrics
// =============================================================================

export interface CPUInfo {
  manufacturer: string
  brand: string
  cores: number
  physicalCores: number
  speed: string
  currentLoad: number
  avgLoad: number
}

export interface MemoryInfo {
  total: number
  used: number
  free: number
  active: number
  available: number
  usedPercent: number
}

export interface DiskInfo {
  fs: string
  type: string
  size: number
  used: number
  available: number
  usedPercent: number
  mount: string
}

export interface NetworkInterface {
  iface: string
  ip4: string
  ip6: string
  mac: string
  type: string
}

export interface NetworkStats {
  iface: string
  rxBytes: number
  txBytes: number
  rxSec: number
  txSec: number
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

export interface SystemInfo {
  hostname: string
  platform: string
  distro: string
  release: string
  arch: string
  kernel: string
}

export interface ProcessInfo {
  pid: number
  name: string
  cpu: number
  mem: number
  memRss: number
}

// =============================================================================
// Docker
// =============================================================================

export interface Container {
  id: string
  name: string
  image: string
  state: string
  status: string
  created: number
  ports: ContainerPort[]
}

export interface ContainerPort {
  privatePort: number
  publicPort?: number
  type: string
}

export interface ContainerStats {
  cpu: number
  memory: number
  memoryUsage: number
  memoryLimit: number
  networkRx: number
  networkTx: number
  blockRead: number
  blockWrite: number
}

export interface ContainerLogs {
  stdout: string
  stderr: string
}

export interface DockerImage {
  id: string
  repository: string
  tag: string
  size: number
  created: number
}

export interface DockerVolume {
  name: string
  driver: string
  mountpoint: string
  scope: string
  createdAt: string
}

export interface DockerNetwork {
  id: string
  name: string
  driver: string
  scope: string
  ipam: {
    driver: string
    config: Array<{ subnet?: string; gateway?: string }>
  }
  containers: Array<{
    name: string
    ipv4Address: string
  }>
}

export interface DockerDiskUsage {
  images: { total: number; size: number }
  containers: { total: number; size: number }
  volumes: { total: number; size: number }
  buildCache: { total: number; size: number }
}

// =============================================================================
// Health Check
// =============================================================================

export interface HealthResponse {
  status: 'ok' | 'error'
  timestamp: string
  version: string
  uptime: number
}

// =============================================================================
// API Response Wrappers
// =============================================================================

// T по умолчанию `unknown` — часть роутов (env.ts) используют `ApiResponse` без
// аргумента для ответов без типизированного `data`.
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}
