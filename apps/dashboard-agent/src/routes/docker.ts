/**
 * Docker API Routes
 * API для управления Docker контейнерами
 */

import type { FastifyInstance } from 'fastify'
import {
  controlContainer,
  docker,
  getAllContainersMemory,
  getContainerLogs,
  getContainers,
  getContainerStats,
  getDockerDiskUsage,
  getImages,
  getNetworks,
  getVolumes,
  pruneBuildCache,
  pruneImages,
  pruneSystem,
} from '../lib/docker'
import type { ApiResponse } from '../types'

export async function dockerRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/docker/containers — список контейнеров
   */
  fastify.get<{ Querystring: { all?: string } }>(
    '/api/docker/containers',
    async (request): Promise<ApiResponse<Awaited<ReturnType<typeof getContainers>>>> => {
      try {
        const all = request.query.all !== 'false'
        const data = await getContainers(all)
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * GET /api/docker/containers/memory — память всех контейнеров
   */
  fastify.get(
    '/api/docker/containers/memory',
    async (): Promise<ApiResponse<Awaited<ReturnType<typeof getAllContainersMemory>>>> => {
      try {
        const data = await getAllContainersMemory()
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * GET /api/docker/containers/:id/stats — статистика контейнера
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/docker/containers/:id/stats',
    async (request): Promise<ApiResponse<Awaited<ReturnType<typeof getContainerStats>>>> => {
      try {
        const data = await getContainerStats(request.params.id)
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * GET /api/docker/containers/:id/logs — логи контейнера
   */
  fastify.get<{ Params: { id: string }; Querystring: { tail?: string } }>(
    '/api/docker/containers/:id/logs',
    async (request): Promise<ApiResponse<Awaited<ReturnType<typeof getContainerLogs>>>> => {
      try {
        const tail = request.query.tail ? parseInt(request.query.tail, 10) : 100
        const data = await getContainerLogs(request.params.id, tail)
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * POST /api/docker/containers/:id/control — управление контейнером
   */
  fastify.post<{ Params: { id: string }; Body: { action: 'start' | 'stop' | 'restart' } }>(
    '/api/docker/containers/:id/control',
    async (request): Promise<ApiResponse<{ message: string }>> => {
      try {
        const { action } = request.body
        if (!['start', 'stop', 'restart'].includes(action)) {
          return {
            success: false,
            error: 'Invalid action. Must be: start, stop, or restart',
            timestamp: new Date().toISOString(),
          }
        }

        await controlContainer(request.params.id, action)

        return {
          success: true,
          data: { message: `Container ${action} successful` },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * GET /api/docker/images — список образов
   */
  fastify.get('/api/docker/images', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getImages>>>> => {
    try {
      const data = await getImages()
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  })

  /**
   * POST /api/docker/images/pull — pull Docker образа
   */
  fastify.post<{ Body: { imageName: string } }>(
    '/api/docker/images/pull',
    async (request): Promise<ApiResponse<{ imageName: string; message: string }>> => {
      try {
        const { imageName } = request.body

        if (!imageName) {
          return {
            success: false,
            error: 'Image name is required',
            timestamp: new Date().toISOString(),
          }
        }

        // Используем docker.pull для загрузки образа
        await new Promise<void>((resolve, reject) => {
          docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
            if (err) {
              reject(err)
              return
            }
            // Ждём завершения потока
            docker.modem.followProgress(stream, (progressErr: Error | null) => {
              if (progressErr) {
                reject(progressErr)
              } else {
                resolve()
              }
            })
          })
        })

        return {
          success: true,
          data: {
            imageName,
            message: `Image ${imageName} pulled successfully`,
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * GET /api/docker/volumes — список volumes
   */
  fastify.get('/api/docker/volumes', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getVolumes>>>> => {
    try {
      const data = await getVolumes()
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  })

  /**
   * GET /api/docker/networks — список сетей
   */
  fastify.get('/api/docker/networks', async (): Promise<ApiResponse<Awaited<ReturnType<typeof getNetworks>>>> => {
    try {
      const data = await getNetworks()
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  })

  /**
   * GET /api/docker/disk-usage — статистика диска Docker
   */
  fastify.get(
    '/api/docker/disk-usage',
    async (): Promise<ApiResponse<Awaited<ReturnType<typeof getDockerDiskUsage>>>> => {
      try {
        const data = await getDockerDiskUsage()
        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * POST /api/docker/prune — очистка неиспользуемых ресурсов Docker
   * Body: { type?: 'buildCache' | 'images' | 'system' }
   * По умолчанию: 'system' (всё)
   */
  fastify.post<{ Body: { type?: string } }>(
    '/api/docker/prune',
    async (request): Promise<ApiResponse<{ spaceReclaimed: number; message: string }>> => {
      try {
        const pruneType = request.body?.type ?? 'system'
        let result: { spaceReclaimed: number }

        if (pruneType === 'buildCache') {
          result = await pruneBuildCache()
        } else if (pruneType === 'images') {
          result = await pruneImages()
        } else {
          result = await pruneSystem()
        }

        const mb = (result.spaceReclaimed / 1024 / 1024).toFixed(1)
        return {
          success: true,
          data: {
            spaceReclaimed: result.spaceReclaimed,
            message: `Очищено ${mb} MB`,
          },
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )
}
