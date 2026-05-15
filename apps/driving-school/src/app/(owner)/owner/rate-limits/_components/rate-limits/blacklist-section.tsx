'use client'

import { Badge, Button, Card, Heading, HStack, Icon, Text } from '@chakra-ui/react'
import { LuBan, LuX } from 'react-icons/lu'

import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'

import type { Organization, RateLimitSettings } from './types'

interface BlacklistSectionProps {
  settings: RateLimitSettings | null
  organizations: Organization[]
  selectedOrganization: string
  onOrganizationChange: (value: string) => void
  getOrganizationName: (organizationId: string) => string
  onRemove: (organizationId: string) => void
  onAdd: () => void
  actionLoading: string | null
}

/**
 * Секция управления blacklist.
 */
export function BlacklistSection({
  settings,
  organizations,
  selectedOrganization,
  onOrganizationChange,
  getOrganizationName,
  onRemove,
  onAdd,
  actionLoading,
}: BlacklistSectionProps) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack>
          <Icon as={LuBan} color="error.solid" />
          <Heading size="md">Blacklist (блокировка API)</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        {settings && settings.blacklist.length > 0 ? (
          <HStack gap={2} flexWrap="wrap">
            {settings.blacklist.map((organizationId) => (
              <Badge key={organizationId} colorPalette="red" size="lg">
                <HStack gap={1}>
                  <Icon as={LuBan} />
                  <span>{getOrganizationName(organizationId)}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => onRemove(organizationId)}
                    loading={actionLoading === `removeFromBlacklist-${organizationId}`}
                    ml={1}
                  >
                    <Icon as={LuX} />
                  </Button>
                </HStack>
              </Badge>
            ))}
          </HStack>
        ) : (
          <Text color="fg.muted">Нет организаций в blacklist</Text>
        )}
        <HStack mt={4} gap={2}>
          <NativeSelectRoot maxW="300px">
            <NativeSelectField value={selectedOrganization} onChange={(e) => onOrganizationChange(e.target.value)}>
              <option value="">Добавить в blacklist...</option>
              {organizations
                .filter((o) => !settings?.blacklist.includes(o.id))
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </NativeSelectField>
          </NativeSelectRoot>
          <Button size="sm" colorPalette="red" disabled={!selectedOrganization} onClick={onAdd}>
            Заблокировать
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
