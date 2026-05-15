'use client'

/**
 * Секция автомобилей инструктора
 *
 * @module instructor-vehicles
 */

import { Badge, Box, Card, Flex, Heading, HStack, Icon, Stack, Text } from '@chakra-ui/react'
import { LuCar, LuCheck, LuStar, LuWrench } from 'react-icons/lu'

import type { InstructorWithRelations } from './instructor-profile.types'

interface InstructorVehiclesProps {
  vehicles: InstructorWithRelations['vehicles']
  teachesOnStudentCar: boolean
}

/**
 * Список автомобилей инструктора
 */
export function InstructorVehicles({ vehicles, teachesOnStudentCar }: InstructorVehiclesProps) {
  if (vehicles.length === 0) {
    return null
  }

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">{vehicles.length > 1 ? 'Автомобили' : 'Автомобиль'}</Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack gap={4}>
          {vehicles.map((vehicle) => (
            <Box
              key={vehicle.id}
              p={3}
              borderWidth={vehicle.isPrimary ? '2px' : '1px'}
              borderColor={vehicle.isPrimary ? 'fg.solid' : 'border'}
              borderRadius="md"
            >
              <Flex justify="space-between" align="flex-start" gap={4} flexWrap="wrap">
                <Stack gap={2}>
                  <HStack>
                    <Icon as={LuCar} boxSize={5} color="fg.muted" />
                    <Text fontWeight="medium">
                      {vehicle.brand} {vehicle.model}
                      {vehicle.year && (
                        <Text as="span" color="fg.muted">
                          {' '}
                          ({vehicle.year})
                        </Text>
                      )}
                    </Text>
                    {vehicle.isPrimary && (
                      <Badge colorPalette="yellow" size="sm">
                        <Icon as={LuStar} boxSize={3} mr={1} />
                        Основной
                      </Badge>
                    )}
                  </HStack>

                  <HStack gap={2} flexWrap="wrap">
                    <Badge colorPalette={vehicle.transmission === 'MANUAL' ? 'blue' : 'green'}>
                      {vehicle.transmission === 'MANUAL' ? 'Механика' : 'Автомат'}
                    </Badge>
                    {vehicle.color && (
                      <Text fontSize="sm" color="fg.muted">
                        {vehicle.color}
                      </Text>
                    )}
                    {vehicle.isAvailable ? (
                      <Badge colorPalette="green" size="sm">
                        <Icon as={LuCheck} boxSize={3} mr={1} />
                        Готов к работе
                      </Badge>
                    ) : (
                      <Badge colorPalette="orange" size="sm">
                        <Icon as={LuWrench} boxSize={3} mr={1} />
                        Недоступен
                      </Badge>
                    )}
                  </HStack>

                  {/* Категории прав для этого авто */}
                  {vehicle.licenseCategories.length > 0 && (
                    <Flex gap={1} flexWrap="wrap">
                      {vehicle.licenseCategories.map((cat) => (
                        <Badge key={cat} size="xs" variant="outline">
                          {cat}
                        </Badge>
                      ))}
                    </Flex>
                  )}

                  {!vehicle.isAvailable && vehicle.unavailableReason && (
                    <Text fontSize="sm" color="orange.fg">
                      {vehicle.unavailableReason}
                    </Text>
                  )}
                </Stack>
              </Flex>
            </Box>
          ))}

          {teachesOnStudentCar && (
            <Badge colorPalette="purple" alignSelf="flex-start">
              Обучает на авто ученика
            </Badge>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
