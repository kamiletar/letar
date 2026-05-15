/**
 * Шапка профиля школы
 *
 * @module school-header
 */

import { Avatar, Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { RatingDisplay } from '@letar/ui'
import { LuMapPin, LuUsers } from 'react-icons/lu'

import { getGroupWord, getInstructorWord } from './school-profile.types'

interface SchoolHeaderProps {
  name: string
  logo: string | null
  averageRating: number | null
  reviewCount: number
  cities: string[]
  membersCount: number
  studyGroupsCount: number
}

/**
 * Карточка с основной информацией о школе
 */
export function SchoolHeader({
  name,
  logo,
  averageRating,
  reviewCount,
  cities,
  membersCount,
  studyGroupsCount,
}: SchoolHeaderProps) {
  return (
    <Card.Root>
      <Card.Body>
        <HStack gap={6} flexWrap="wrap">
          <Avatar.Root size="2xl">
            <Avatar.Image src={logo ?? undefined} alt={name} />
            <Avatar.Fallback>{name.charAt(0)}</Avatar.Fallback>
          </Avatar.Root>

          <Stack gap={2} flex={1}>
            <Heading size="xl">{name}</Heading>

            <RatingDisplay rating={averageRating} reviewCount={reviewCount} size="lg" />

            <HStack gap={4} color="fg.muted" flexWrap="wrap">
              {membersCount > 0 && (
                <HStack>
                  <LuUsers size={18} />
                  <Text>
                    {membersCount} {getInstructorWord(membersCount)}
                  </Text>
                </HStack>
              )}

              {studyGroupsCount > 0 && (
                <Text>
                  {studyGroupsCount} {getGroupWord(studyGroupsCount)}
                </Text>
              )}
            </HStack>

            {cities.length > 0 && (
              <HStack color="fg.muted">
                <LuMapPin size={18} />
                <Text>{cities.join(', ')}</Text>
              </HStack>
            )}
          </Stack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
