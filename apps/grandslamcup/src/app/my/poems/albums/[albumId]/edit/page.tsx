/**
 * Редактирование альбома: метаданные + состав стихов.
 */

import { getAlbumForEditAction } from '@/app/my/poems/_actions/album.action'
import { requirePoet } from '@/lib/roles'
import { Heading, Separator, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { AlbumForm } from '../../../_components/album-form'
import { AlbumPoemSelector } from '../../../_components/album-poem-selector'

export const metadata: Metadata = {
  title: 'Редактирование альбома',
}

type Params = Promise<{ albumId: string }>

export default async function EditAlbumPage({ params }: { params: Params }) {
  await requirePoet()
  const { albumId } = await params

  const result = await getAlbumForEditAction(albumId)
  if ('error' in result || !result.data) notFound()

  const { album, allPoems } = result.data

  return (
    <VStack gap={8} align="stretch" maxW="3xl">
      <Heading as="h1" size="xl">
        {album.title}
      </Heading>

      {/* Метаданные альбома */}
      <AlbumForm
        albumId={album.id}
        initialData={{
          title: album.title,
          coverImage: album.coverImage,
          publishedAt: album.publishedAt ? album.publishedAt.toISOString() : null,
        }}
      />

      <Separator />

      {/* Состав стихов */}
      <Heading size="md">Стихотворения в альбоме</Heading>
      <AlbumPoemSelector
        albumId={album.id}
        initialAlbumPoems={album.albumPoems.map((ap) => ap.poem)}
        allPoems={allPoems}
      />
    </VStack>
  )
}
