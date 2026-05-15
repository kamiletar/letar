/**
 * System Information Wrapper
 * Сбор системных метрик через systeminformation
 */

import * as si from 'systeminformation'
import type { CPUInfo, DiskInfo, MemoryInfo, NetworkInfo, ProcessInfo, SystemInfo, SystemUptime } from '../types'

// =============================================================================
// Кэширование для снижения нагрузки
// =============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: number
}

let cpuCache: CacheEntry<CPUInfo> | null = null
let memoryCache: CacheEntry<MemoryInfo> | null = null
let diskCache: CacheEntry<DiskInfo[]> | null = null
let processesCache: CacheEntry<ProcessInfo[]> | null = null

const CPU_CACHE_TTL = 2000 // 2 сек
const MEMORY_CACHE_TTL = 2000 // 2 сек
const DISK_CACHE_TTL = 10000 // 10 сек
const PROCESSES_CACHE_TTL = 10000 // 10 сек

// =============================================================================
// System Metrics
// =============================================================================

/**
 * Получение информации о CPU
 */
export async function getCPUInfo(): Promise<CPUInfo> {
  const now = Date.now()
  if (cpuCache && now - cpuCache.timestamp < CPU_CACHE_TTL) {
    return cpuCache.data
  }

  try {
    const [currentLoad, cpuInfo] = await Promise.all([si.currentLoad(), si.cpu()])

    const result: CPUInfo = {
      manufacturer: cpuInfo.manufacturer,
      brand: cpuInfo.brand,
      cores: cpuInfo.cores,
      physicalCores: cpuInfo.physicalCores,
      speed: `${cpuInfo.speed} GHz`,
      currentLoad: currentLoad.currentLoad,
      avgLoad: currentLoad.avgLoad,
    }

    cpuCache = { data: result, timestamp: now }
    return result
  } catch (error) {
    console.error('[System] Error getting CPU info:', error)
    throw error
  }
}

/**
 * Получение информации о памяти
 */
export async function getMemoryInfo(): Promise<MemoryInfo> {
  const now = Date.now()
  if (memoryCache && now - memoryCache.timestamp < MEMORY_CACHE_TTL) {
    return memoryCache.data
  }

  try {
    const mem = await si.mem()

    const result: MemoryInfo = {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      active: mem.active,
      available: mem.available,
      usedPercent: (mem.used / mem.total) * 100,
    }

    memoryCache = { data: result, timestamp: now }
    return result
  } catch (error) {
    console.error('[System] Error getting memory info:', error)
    throw error
  }
}

/**
 * Получение информации о дисках
 */
export async function getDiskInfo(): Promise<DiskInfo[]> {
  const now = Date.now()
  if (diskCache && now - diskCache.timestamp < DISK_CACHE_TTL) {
    return diskCache.data
  }

  try {
    const disks = await si.fsSize()

    const result: DiskInfo[] = disks.map((disk) => ({
      fs: disk.fs,
      type: disk.type,
      size: disk.size,
      used: disk.used,
      available: disk.available,
      usedPercent: disk.use,
      mount: disk.mount,
    }))

    diskCache = { data: result, timestamp: now }
    return result
  } catch (error) {
    console.error('[System] Error getting disk info:', error)
    throw error
  }
}

/**
 * Получение информации о сети
 */
export async function getNetworkInfo(): Promise<NetworkInfo> {
  try {
    const [networkStats, networkInterfaces] = await Promise.all([si.networkStats(), si.networkInterfaces()])

    return {
      interfaces: networkInterfaces.map((iface) => ({
        iface: iface.iface,
        ip4: iface.ip4,
        ip6: iface.ip6,
        mac: iface.mac,
        type: iface.type,
      })),
      stats: networkStats.map((stat) => ({
        iface: stat.iface,
        rxBytes: stat.rx_bytes,
        txBytes: stat.tx_bytes,
        rxSec: stat.rx_sec ?? 0,
        txSec: stat.tx_sec ?? 0,
      })),
    }
  } catch (error) {
    console.error('[System] Error getting network info:', error)
    throw error
  }
}

/**
 * Получение uptime системы
 */
export async function getSystemUptime(): Promise<SystemUptime> {
  try {
    const time = await si.time()

    return {
      uptime: time.uptime,
      timezone: time.timezone,
      timezoneName: time.timezoneName,
    }
  } catch (error) {
    console.error('[System] Error getting system uptime:', error)
    throw error
  }
}

/**
 * Получение общей информации о системе
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  try {
    const osInfo = await si.osInfo()

    return {
      hostname: osInfo.hostname,
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: osInfo.arch,
      kernel: osInfo.kernel,
    }
  } catch (error) {
    console.error('[System] Error getting system info:', error)
    throw error
  }
}

/**
 * Получение топ процессов по использованию памяти
 */
export async function getTopProcesses(limit = 20): Promise<ProcessInfo[]> {
  const now = Date.now()
  if (processesCache && now - processesCache.timestamp < PROCESSES_CACHE_TTL) {
    return processesCache.data.slice(0, limit)
  }

  try {
    const processes = await si.processes()

    const result: ProcessInfo[] = processes.list
      .sort((a, b) => b.memRss - a.memRss)
      .slice(0, 50) // Храним топ-50, отдаём limit
      .map((proc) => ({
        pid: proc.pid,
        name: proc.name,
        cpu: proc.cpu,
        mem: proc.mem,
        memRss: proc.memRss,
      }))

    processesCache = { data: result, timestamp: now }
    return result.slice(0, limit)
  } catch (error) {
    console.error('[System] Error getting processes:', error)
    throw error
  }
}
