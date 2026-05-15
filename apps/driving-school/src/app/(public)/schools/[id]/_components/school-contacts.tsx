/**
 * Боковая панель контактов школы
 *
 * @module school-contacts
 */

import { Card, Link as ChakraLink, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import { formatPhone } from '@letar/format-utils'
import { LuGlobe, LuMail, LuMapPin, LuPhone } from 'react-icons/lu'

import { EnrollButton } from './enroll-button'

interface SchoolContactsProps {
  schoolId: string
  phone: string | null
  email: string | null
  website: string | null
  cities: string[]
  isAuthenticated: boolean
}

/**
 * Карточка с контактами школы и кнопкой записи
 */
export function SchoolContacts({ schoolId, phone, email, website, cities, isAuthenticated }: SchoolContactsProps) {
  return (
    <Card.Root position="sticky" top={4}>
      <Card.Header>
        <Heading size="md">Контакты</Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack gap={4}>
          {phone && (
            <HStack>
              <LuPhone size={18} />
              <ChakraLink href={`tel:${phone}`} color="brand.solid" _hover={{ textDecoration: 'underline' }}>
                {formatPhone(phone)}
              </ChakraLink>
            </HStack>
          )}

          {email && (
            <HStack>
              <LuMail size={18} />
              <ChakraLink href={`mailto:${email}`} color="brand.solid" _hover={{ textDecoration: 'underline' }}>
                {email}
              </ChakraLink>
            </HStack>
          )}

          {website && (
            <HStack>
              <LuGlobe size={18} />
              <ChakraLink
                href={`/api/redirect?url=${encodeURIComponent(
                  website.startsWith('http') ? website : `https://${website}`
                )}`}
                target="_blank"
                rel="nofollow noopener noreferrer"
                color="brand.solid"
                _hover={{ textDecoration: 'underline' }}
              >
                {website}
              </ChakraLink>
            </HStack>
          )}

          {cities.length > 0 && (
            <HStack>
              <LuMapPin size={18} />
              <Text>{cities.join(', ')}</Text>
            </HStack>
          )}

          <EnrollButton schoolId={schoolId} isAuthenticated={isAuthenticated} />

          <Text fontSize="sm" color="fg.muted" textAlign="center">
            После записи менеджер школы свяжется с вами для уточнения деталей
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
