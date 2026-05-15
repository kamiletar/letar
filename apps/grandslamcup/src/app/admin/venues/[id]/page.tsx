import { EntityPhotoUploader } from '@/app/_components/entity-photo-uploader'
import { prisma } from '@/lib/db'
import { Circle, Flex, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { LuMapPin } from 'react-icons/lu'
import { VenueForm } from '../_components/venue-form'

export default async function EditVenuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const venue = await prisma.venue.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      cityId: true,
      address: true,
      telegramLink: true,
      websiteUrl: true,
      description: true,
      photo: true,
    },
  })

  if (!venue) {
    notFound()
  }

  return (
    <VStack gap={6} align="stretch">
      <Flex justify="center">
        <EntityPhotoUploader
          entityType="venue"
          entityId={venue.id}
          currentPhoto={venue.photo}
          placeholder={
            <Circle size={14} bg="brand.subtle" color="brand.solid">
              <LuMapPin size={28} />
            </Circle>
          }
          label="Фото стадиона"
        />
      </Flex>
      <VenueForm venue={venue} />
    </VStack>
  )
}
