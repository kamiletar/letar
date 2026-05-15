import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import type { RemoteServerClient } from '@/lib/server-client/remote'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/system/processes
 * Прокси к dashboard-agent /api/system/processes
 * Формирует ProcessesData из данных агента
 * Query: limit=N, serverId=<id>
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl
    const serverId = searchParams.get('serverId')

    const { client } = await getClientByServerId(serverId)
    const remoteClient = client as RemoteServerClient

    const [processes, memory, dockerMemory] = await Promise.all([
      remoteClient.getTopProcesses(20),
      remoteClient.getMemoryInfo(),
      remoteClient.getAllContainersMemory().catch(() => null),
    ])

    // Группируем процессы по имени
    const groupMap = new Map<string, { count: number; totalMem: number }>()
    for (const p of processes) {
      const existing = groupMap.get(p.name)
      if (existing) {
        existing.count++
        existing.totalMem += p.memRss
      } else {
        groupMap.set(p.name, { count: 1, totalMem: p.memRss })
      }
    }
    const totalMemory = memory.total
    const memoryGroups = Array.from(groupMap.entries())
      .map(([name, { count, totalMem }]) => ({
        name,
        count,
        totalMem,
        totalMemPercent: totalMemory > 0 ? (totalMem / totalMemory) * 100 : 0,
      }))
      .sort((a, b) => b.totalMem - a.totalMem)
      .slice(0, 20)

    const totalProcessMemory = processes.reduce((sum, p) => sum + p.memRss, 0)

    return NextResponse.json({
      all: processes.length,
      running: 0,
      blocked: 0,
      sleeping: processes.length,
      topByMemory: processes.map((p) => ({
        pid: p.pid,
        name: p.name,
        command: p.name,
        cpu: p.cpu,
        mem: p.mem,
        memRss: p.memRss,
        memVsz: 0,
        user: '',
        state: '',
      })),
      memoryGroups,
      memorySummary: {
        total: memory.total,
        used: memory.used,
        active: memory.active ?? memory.used,
        available: memory.available,
        buffcache: 0,
        slab: 0,
        totalProcessMemory,
        topProcessesMemory: totalProcessMemory,
        kernelAndBuffers: Math.max(0, memory.used - totalProcessMemory),
      },
      dockerMemory: dockerMemory
        ? {
            total: dockerMemory.totalDockerMemory,
            containerCount: dockerMemory.containerCount,
            containers: dockerMemory.containers.map((c) => ({
              id: c.id,
              name: c.name,
              memoryUsage: c.memoryUsage,
              memoryLimit: c.memoryLimit,
              memoryPercent: c.memoryPercent,
            })),
          }
        : undefined,
    })
  } catch (error) {
    console.error('Error in /api/system/processes:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
