'use client'

import { getCategoryDisplayName } from '@/lib/license-categories/license-categories'
import { Avatar, Badge, Box, Card, Heading, HStack, Text, VStack, Wrap } from '@chakra-ui/react'
import { formatPhone } from '@letar/format-utils'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { LuBuilding, LuCalendar, LuMail, LuMapPin, LuPhone } from 'react-icons/lu'
import type { OrganizationDetails } from '../_actions/organization-management.action'

interface SchoolInfoCardProps {
  organization: OrganizationDetails
}

export function SchoolInfoCard({ organization }: SchoolInfoCardProps) {
  return (
    <Card.Root>
      <Card.Body>
        <HStack gap={6} align="start" flexWrap={{ base: 'wrap', md: 'nowrap' }}>
          <Avatar.Root size="2xl">
            {organization.logo && <Avatar.Image src={organization.logo} />}
            <Avatar.Fallback>
              <LuBuilding size={32} />
            </Avatar.Fallback>
          </Avatar.Root>

          <VStack align="start" gap={3} flex={1}>
            <Box>
              <Heading size="xl">{organization.name}</Heading>
              {organization.description && (
                <Text color="fg.muted" mt={1}>
                  {organization.description}
                </Text>
              )}
            </Box>

            <VStack align="start" gap={1}>
              {organization.cities.length > 0 && (
                <HStack gap={2} color="fg.muted" fontSize="sm">
                  <LuMapPin size={16} />
                  <Text>{organization.cities.join(', ')}</Text>
                </HStack>
              )}
              {organization.phone && (
                <HStack gap={2} color="fg.muted" fontSize="sm">
                  <LuPhone size={16} />
                  <Text>{formatPhone(organization.phone)}</Text>
                </HStack>
              )}
              {organization.email && (
                <HStack gap={2} color="fg.muted" fontSize="sm">
                  <LuMail size={16} />
                  <Text>{organization.email}</Text>
                </HStack>
              )}
              <HStack gap={2} color="fg.muted" fontSize="sm">
                <LuCalendar size={16} />
                <Text>Создана {format(organization.createdAt, 'd MMMM yyyy', { locale: ru })}</Text>
              </HStack>
            </VStack>

            {organization.licenseCategories.length > 0 && (
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={2}>
                  Категории обучения:
                </Text>
                <Wrap gap={2}>
                  {organization.licenseCategories.map((category) => (
                    <Badge key={category} colorPalette="orange" size="sm">
                      {getCategoryDisplayName(category)}
                    </Badge>
                  ))}
                </Wrap>
              </Box>
            )}
          </VStack>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
