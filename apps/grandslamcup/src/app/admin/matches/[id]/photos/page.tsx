/**
 * Админ: управление фотографиями матча.
 * Загрузка + галерея с удалением.
 */

import { PhotoGallery } from '@/app/_components/photo-gallery'
import { PhotoUploader } from '@/app/_components/photo-uploader'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/roles'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'

import { deletePhotoAction } from '../../_actions/photos.action'

export default async function AdminMatchPhotosPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params

  const match = await prisma.match.findUnique({
    where: { id },
    select: {
      id: true,
      homeTeam: { select: { team: { select: { name: true } } } },
      awayTeam: { select: { team: { select: { name: true } } } },
      scheduledAt: true,
      photos: {
        orderBy: { order: 'asc' },
        select: { id: true, path: true, caption: true, width: true, height: true },
      },
    },
  })

  if (!match) {
    notFound()
  }

  const title = `${match.homeTeam.team.name} — ${match.awayTeam.team.name}`

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="lg">Фото матча</Heading>
        <Text color="fg.muted">{title}</Text>
      </Box>

      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={5}>
        <Heading size="md" mb={4}>
          Загрузить фото
        </Heading>
        <PhotoUploader matchId={match.id} />
      </Box>

      {match.photos.length > 0 && (
        <Box>
          <Heading size="md" mb={3}>
            Галерея ({match.photos.length})
          </Heading>
          <PhotoGallery photos={match.photos} canDelete onDelete={deletePhotoAction} />
        </Box>
      )}
    </VStack>
  )
}
