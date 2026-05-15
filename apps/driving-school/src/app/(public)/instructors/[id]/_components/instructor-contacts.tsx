/**
 * Боковая панель контактов инструктора
 *
 * @module instructor-contacts
 */

import type { InstructorType } from '@/lib/instructor-type'
import { Card, Heading, HStack, Stack, Text } from '@chakra-ui/react'
import type { TransmissionType } from '@letar/driving-school-db/prisma'
import { formatPhone } from '@letar/format-utils'
import { LuPhone } from 'react-icons/lu'

import { EnrollButton } from './enroll-button'

interface InstructorContactsProps {
  instructorId: string
  instructorUserId: string
  instructorName: string
  phone: string | null
  instructorType: InstructorType
  schools: Array<{ id: string; name: string }>
  vehicles: Array<{
    id: string
    brand: string
    model: string
    transmission: TransmissionType
  }>
  isLoggedIn: boolean
  hasExistingConnection: boolean
  hasPendingRequest: boolean
  isOwnProfile: boolean
}

/**
 * Карточка с контактами и кнопкой записи
 */
export function InstructorContacts({
  instructorId,
  instructorUserId,
  instructorName,
  phone,
  instructorType,
  schools,
  vehicles,
  isLoggedIn,
  hasExistingConnection,
  hasPendingRequest,
  isOwnProfile,
}: InstructorContactsProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Связаться</Heading>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack gap={4}>
          {phone && (
            <HStack>
              <LuPhone size={18} />
              <Text>{formatPhone(phone)}</Text>
            </HStack>
          )}

          <EnrollButton
            instructorId={instructorId}
            instructorUserId={instructorUserId}
            instructorName={instructorName}
            instructorType={instructorType}
            schools={schools}
            vehicles={vehicles}
            isLoggedIn={isLoggedIn}
            hasExistingConnection={hasExistingConnection}
            hasPendingRequest={hasPendingRequest}
            isOwnProfile={isOwnProfile}
          />

          <Text fontSize="sm" color="fg.muted" textAlign="center">
            После записи инструктор свяжется с вами для уточнения деталей
          </Text>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
