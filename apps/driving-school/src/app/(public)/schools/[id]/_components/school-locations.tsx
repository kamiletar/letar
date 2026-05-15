/**
 * Секция филиалов школы
 *
 * @module school-locations
 */

import { formatWorkingHoursCompact, isOpenNow, parseWorkingHours } from '@/lib/working-hours'
import { Badge, Box, Card, Link as ChakraLink, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { formatPhone } from '@letar/format-utils'
import Image from 'next/image'
import { LuClock, LuMapPin, LuPhone } from 'react-icons/lu'

import { getLocationIcon, LOCATION_TYPE_CONFIG, type TeamWithLocation } from './school-profile.types'

interface SchoolLocationsProps {
  teams: TeamWithLocation[]
}

/** Тип команды с гарантированно присутствующей локацией */
type TeamWithRequiredLocation = TeamWithLocation & {
  locationData: NonNullable<TeamWithLocation['locationData']>
}

/**
 * Список филиалов и точек школы
 */
export function SchoolLocations({ teams }: SchoolLocationsProps) {
  // Фильтруем только команды с данными о локации (type guard сужает тип)
  const teamsWithLocation = teams.filter(
    (team: TeamWithLocation): team is TeamWithRequiredLocation => team.locationData !== null
  )

  if (teamsWithLocation.length === 0) {
    return null
  }

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Филиалы и точки</Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {teamsWithLocation.map((team: TeamWithRequiredLocation) => {
            const location = team.locationData
            const LocationIcon = getLocationIcon(location.type)
            const typeConfig = LOCATION_TYPE_CONFIG[location.type]
            const workingHours = parseWorkingHours(location.workingHours)
            const firstImage = team.files[0]?.file

            return (
              <Box key={team.id} p={4} borderWidth={1} borderRadius="lg" bg="bg.panel">
                <HStack gap={4} align="flex-start">
                  {/* Фото или иконка */}
                  {firstImage ? (
                    <Box
                      width="80px"
                      height="80px"
                      borderRadius="md"
                      overflow="hidden"
                      flexShrink={0}
                      position="relative"
                    >
                      <Image
                        src={`/api/files/${firstImage.path}`}
                        alt={team.name}
                        fill
                        style={{ objectFit: 'cover' }}
                        sizes="80px"
                      />
                    </Box>
                  ) : (
                    <Box
                      p={4}
                      bg={`${typeConfig.color}.subtle`}
                      borderRadius="md"
                      color={`${typeConfig.color}.solid`}
                      flexShrink={0}
                    >
                      <LocationIcon size={32} />
                    </Box>
                  )}

                  <Stack gap={2} flex={1}>
                    <HStack gap={2}>
                      <Text fontWeight="semibold">{team.name}</Text>
                      <Badge size="sm" colorPalette={typeConfig.color} variant="subtle">
                        {typeConfig.label}
                      </Badge>
                    </HStack>

                    <Stack gap={1} fontSize="sm" color="fg.muted">
                      <HStack gap={2}>
                        <LuMapPin size={14} />
                        <Text>
                          {location.city}, {location.address}
                        </Text>
                      </HStack>

                      {location.phone && (
                        <HStack gap={2}>
                          <LuPhone size={14} />
                          <ChakraLink href={`tel:${location.phone}`} color="brand.solid">
                            {formatPhone(location.phone)}
                          </ChakraLink>
                        </HStack>
                      )}

                      {workingHours && (
                        <HStack gap={2}>
                          <LuClock size={14} />
                          <Text>{formatWorkingHoursCompact(workingHours).join(', ')}</Text>
                        </HStack>
                      )}
                    </Stack>

                    {workingHours && (
                      <Badge
                        colorPalette={isOpenNow(workingHours, location.timezone) ? 'green' : 'red'}
                        size="sm"
                        width="fit-content"
                      >
                        {isOpenNow(workingHours, location.timezone) ? 'Открыто' : 'Закрыто'}
                      </Badge>
                    )}
                  </Stack>
                </HStack>
              </Box>
            )
          })}
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}
