import { isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, Text } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { AdminPageLayout } from '../_components/admin-page-layout'
import { AudioTable } from './_components/audio-table'
import { AudioUploader } from './_components/audio-uploader'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AdminAudioPage({ params }: PageProps) {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/sign-in')
  }

  const { locale } = await params

  const [audioFiles, total] = await Promise.all([
    prisma.audioFile.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        artist: true,
        album: true,
        path: true,
        size: true,
        mimeType: true,
        bitrate: true,
        uploadedAt: true,
      },
    }),
    prisma.audioFile.count(),
  ])

  return (
    <AdminPageLayout
      title="Аудио"
      total={total}
      basePath={`/${locale}/admin/audio`}
      isEmpty={audioFiles.length === 0}
      emptyText="Аудиофайлов пока нет. Загрузите первый файл."
      headerExtra={
        <Card.Root>
          <Card.Header>
            <Text fontWeight="semibold">Загрузка аудио</Text>
          </Card.Header>
          <Card.Body pt={0}>
            <AudioUploader />
          </Card.Body>
        </Card.Root>
      }
    >
      <AudioTable audioFiles={audioFiles} locale={locale} />
    </AdminPageLayout>
  )
}
