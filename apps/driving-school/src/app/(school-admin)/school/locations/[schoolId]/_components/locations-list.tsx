'use client'

import { Box, Button, Dialog as ChakraDialog, Heading, HStack, Portal, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuMapPin, LuPlus } from 'react-icons/lu'
import type { LocationWithDetails } from '../_actions/location.action'
import { LocationCard } from './location-card'
import { LocationForm } from './location-form'

type Props = {
  organizationId: string
  locations: LocationWithDetails[]
}

export function LocationsList({ organizationId, locations }: Props) {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  // Группируем по городам (город берём из locationData)
  const locationsByCity = locations.reduce(
    (acc, location) => {
      const city = location.locationData?.city ?? 'Без города'
      if (!acc[city]) {
        acc[city] = []
      }
      acc[city].push(location)
      return acc
    },
    {} as Record<string, LocationWithDetails[]>
  )

  const cities = Object.keys(locationsByCity).sort()

  return (
    <Stack gap={6}>
      {/* Кнопка добавления */}
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="lg">Филиалы и точки</Heading>
          <Text color="fg.muted" mt={1}>
            Офисы, учебные классы и площадки вашей автошколы
          </Text>
        </Box>
        <Button colorPalette="brand" onClick={() => setIsCreateOpen(true)}>
          <LuPlus />
          Добавить филиал
        </Button>
      </HStack>

      {/* Список филиалов */}
      {locations.length === 0 ? (
        <Box
          p={8}
          bg="bg.muted"
          borderRadius="lg"
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="border.muted"
          textAlign="center"
        >
          <LuMapPin size={48} style={{ margin: '0 auto', opacity: 0.3 }} />
          <Text mt={4} fontWeight="medium">
            Филиалы не добавлены
          </Text>
          <Text color="fg.muted" mt={1}>
            Добавьте офисы, учебные классы и площадки вашей автошколы
          </Text>
          <Button mt={4} colorPalette="brand" onClick={() => setIsCreateOpen(true)}>
            <LuPlus />
            Добавить первый филиал
          </Button>
        </Box>
      ) : (
        <Stack gap={6}>
          {cities.map((city) => (
            <Box key={city}>
              <HStack gap={2} mb={3}>
                <LuMapPin size={18} />
                <Text fontWeight="semibold" fontSize="lg">
                  {city}
                </Text>
                <Text color="fg.muted" fontSize="sm">
                  ({locationsByCity[city].length})
                </Text>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                {locationsByCity[city].map((location) => (
                  <LocationCard key={location.id} location={location} organizationId={organizationId} />
                ))}
              </SimpleGrid>
            </Box>
          ))}
        </Stack>
      )}

      {/* Диалог создания */}
      <ChakraDialog.Root
        open={isCreateOpen}
        onOpenChange={(e) => setIsCreateOpen(e.open)}
        size={{ base: 'full', md: 'lg' }}
      >
        <Portal>
          <ChakraDialog.Backdrop />
          <ChakraDialog.Positioner>
            <ChakraDialog.Content>
              <ChakraDialog.Header>
                <ChakraDialog.Title>Добавить филиал</ChakraDialog.Title>
              </ChakraDialog.Header>
              <ChakraDialog.Body>
                <LocationForm organizationId={organizationId} onSuccess={() => setIsCreateOpen(false)} />
              </ChakraDialog.Body>
              <ChakraDialog.CloseTrigger />
            </ChakraDialog.Content>
          </ChakraDialog.Positioner>
        </Portal>
      </ChakraDialog.Root>
    </Stack>
  )
}
