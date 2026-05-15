/**
 * Секция инструкторов школы
 *
 * @module school-instructors
 */

import { formatExperience } from '@/lib/date-utils'
import { Avatar, Card, Heading, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { RatingDisplay } from '@letar/ui'

import type { MemberWithUser } from './school-profile.types'

interface SchoolInstructorsProps {
  members: MemberWithUser[]
}

/**
 * Список инструкторов школы
 */
export function SchoolInstructors({ members }: SchoolInstructorsProps) {
  if (members.length === 0) {
    return null
  }

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Инструкторы</Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          {members.map((member: MemberWithUser) => (
            <HStack key={member.id} p={4} borderWidth={1} borderRadius="md" justify="space-between">
              <HStack gap={3}>
                <Avatar.Root size="md">
                  <Avatar.Image src={member.user.image ?? undefined} alt={member.user.name || 'Member'} />
                  <Avatar.Fallback>{member.user.name?.charAt(0) || '?'}</Avatar.Fallback>
                </Avatar.Root>
                <Stack gap={0}>
                  <Text fontWeight="medium">{member.user.name || 'Без имени'}</Text>
                  {member.user.instructorProfile?.experienceStartDate && (
                    <Text fontSize="sm" color="fg.muted">
                      Опыт: {formatExperience(member.user.instructorProfile.experienceStartDate)}
                    </Text>
                  )}
                </Stack>
              </HStack>
              {member.user.instructorProfile && (
                <RatingDisplay
                  rating={member.user.instructorProfile.averageRating}
                  reviewCount={member.user.instructorProfile.reviewCount}
                  size="sm"
                  compact
                />
              )}
            </HStack>
          ))}
        </SimpleGrid>
      </Card.Body>
    </Card.Root>
  )
}
