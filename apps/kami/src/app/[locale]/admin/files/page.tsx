import { isAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, Text } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { AdminPageLayout } from '../_components/admin-page-layout'
import { FileUploader } from './_components/file-uploader'
import { FilesTable } from './_components/files-table'

interface PageProps {
  params: Promise<{ locale: string }>
}

export default async function AdminFilesPage({ params }: PageProps) {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/sign-in')
  }

  const { locale } = await params

  const [files, total] = await Promise.all([
    prisma.uploadedFile.findMany({
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        filename: true,
        path: true,
        mimeType: true,
        size: true,
        description: true,
        uploadedAt: true,
      },
    }),
    prisma.uploadedFile.count(),
  ])

  return (
    <AdminPageLayout
      title="Файлы"
      total={total}
      basePath={`/${locale}/admin/files`}
      isEmpty={files.length === 0}
      emptyText="Файлов пока нет. Загрузите первый файл."
      headerExtra={
        <Card.Root>
          <Card.Header>
            <Text fontWeight="semibold">Загрузка файлов</Text>
          </Card.Header>
          <Card.Body pt={0}>
            <FileUploader />
          </Card.Body>
        </Card.Root>
      }
    >
      <FilesTable files={files} />
    </AdminPageLayout>
  )
}
