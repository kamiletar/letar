/**
 * Карточка стадиона с фото, названием, адресом и домашними командами.
 */

import { Badge, Box, Circle, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import Link from 'next/link'
import { LuMapPin } from 'react-icons/lu'

interface VenueCardProps {
  slug: string
  name: string
  cityName: string
  address: string | null
  photo: string | null
  teamNames: string[]
  /** Slug города для city-aware ссылок */
  citySlug?: string
}

export function VenueCard({ slug, name, cityName: _cityName, address, photo, teamNames, citySlug }: VenueCardProps) {
  return (
    <Link href={citySlug ? `/${citySlug}/venues/${slug}` : `/venues/${slug}`}>
      <Box
        bg="bg.panel"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="border"
        overflow="hidden"
        _hover={{ borderColor: 'border.emphasized', shadow: 'lg', transform: 'translateY(-2px)' }}
        transition="all 0.2s ease"
        h="full"
      >
        {/* Фото или плейсхолдер */}
        <Box position="relative" w="full" pt="56%" bg="bg.subtle">
          {photo ? (
            <Image
              src={photo.startsWith('http') ? photo : `/api/files/${photo}`}
              alt={name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <Flex
              position="absolute"
              inset={0}
              align="center"
              justify="center"
              bg={{ base: 'gray.100', _dark: 'gray.800' }}
            >
              <Circle size={14} bg="brand.subtle" color="brand.solid">
                <LuMapPin size={28} />
              </Circle>
            </Flex>
          )}
        </Box>

        {/* Контент */}
        <VStack gap={2} p={4} align="start">
          <Heading size="sm" lineClamp={1}>
            {name}
          </Heading>
          {address && (
            <HStack gap={1} color="fg.muted" fontSize="xs">
              <LuMapPin size={12} />
              <Text lineClamp={1}>{address}</Text>
            </HStack>
          )}
          {teamNames.length > 0 && (
            <Flex gap={1} wrap="wrap">
              {teamNames.map((tn) => (
                <Badge key={tn} size="sm" colorPalette="blue" variant="subtle">
                  {tn}
                </Badge>
              ))}
            </Flex>
          )}
        </VStack>
      </Box>
    </Link>
  )
}
