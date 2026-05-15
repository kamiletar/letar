import { getClientByServerId, updateServerLastSeen } from '@/lib/server-client/get-client-by-id'
import type { DockerImage } from '@/lib/server-client/types'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/docker/images
 * Возвращает список всех Docker образов
 * Поддерживает serverId для получения образов с удалённых серверов
 */
export async function GET(request: NextRequest) {
  try {
    const serverId = request.nextUrl.searchParams.get('serverId')
    const { client, server } = await getClientByServerId(serverId)

    const images = await client.getImages()

    if (server) {
      updateServerLastSeen(server.id)
    }

    // Группируем образы по репозиториям
    type ImageWithRepo = DockerImage & { repository: string; tag: string }
    const groupedImages = images.reduce<Record<string, ImageWithRepo[]>>((acc, image) => {
      const repoTag = image.repoTags?.[0] || '<none>:<none>'
      const [repo, tag] = repoTag.split(':')

      if (!acc[repo]) {
        acc[repo] = []
      }

      acc[repo].push({
        ...image,
        repository: repo,
        tag,
      })

      return acc
    }, {})

    // Подсчитываем общий размер
    const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0)

    return NextResponse.json({
      success: true,
      count: images.length,
      totalSize,
      images,
      groupedImages,
    })
  } catch (error) {
    console.error('Error in /api/docker/images:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
