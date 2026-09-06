import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { AdminPageLayout } from '../_components'
import { VideosTable } from './_components/videos-table'

interface VideosAdminPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/**
 * Сохранённые видео (Web Share Target из Android — ссылка YouTube/Vimeo или видеофайл) —
 * приватный раздел, только владелец.
 */
export default async function VideosAdminPage({ params, searchParams }: VideosAdminPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const [videos, total] = await Promise.all([
    prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        source: true,
        title: true,
        url: true,
        provider: true,
        thumbnailUrl: true,
        filename: true,
        mimeType: true,
        category: true,
        tags: true,
        createdAt: true,
      },
    }),
    prisma.video.count(),
  ])

  return (
    <AdminPageLayout
      title="Видео"
      total={total}
      basePath={`/${locale}/admin/videos`}
      emptyText="Видео пока нет — поделитесь ссылкой на YouTube/Vimeo или видеофайлом с телефона через Android Share"
      isEmpty={videos.length === 0}
    >
      <VideosTable videos={videos} />
    </AdminPageLayout>
  )
}
