/**
 * Создание нового альбома стихотворений.
 */

import { requirePoet } from '@/lib/roles'
import { Heading, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'

import { AlbumForm } from '../../_components/album-form'

export const metadata: Metadata = {
  title: 'Новый альбом',
}

export default async function NewAlbumPage() {
  await requirePoet()

  return (
    <VStack gap={6} align="stretch" maxW="xl">
      <Heading as="h1" size="xl">
        Новый альбом
      </Heading>
      <AlbumForm />
    </VStack>
  )
}
