'use client'

import { Badge, Button, Card, Heading, HStack, Icon, Text } from '@chakra-ui/react'
import { LuCheck, LuShield, LuX } from 'react-icons/lu'

import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'

import type { Organization, RateLimitSettings } from './types'

interface WhitelistSectionProps {
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
 * Секция управления whitelist.
 */
export function WhitelistSection({
  settings,
  organizations,
  selectedOrganization,
  onOrganizationChange,
  getOrganizationName,
  onRemove,
  onAdd,
  actionLoading,
}: WhitelistSectionProps) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <HStack>
            <Icon as={LuShield} color="success.solid" />
            <Heading size="md">Whitelist (без лимитов)</Heading>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        {settings && settings.whitelist.length > 0 ? (
          <HStack gap={2} flexWrap="wrap">
            {settings.whitelist.map((organizationId) => (
              <Badge key={organizationId} colorPalette="green" size="lg">
                <HStack gap={1}>
                  <Icon as={LuCheck} />
                  <span>{getOrganizationName(organizationId)}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => onRemove(organizationId)}
                    loading={actionLoading === `removeFromWhitelist-${organizationId}`}
                    ml={1}
                  >
                    <Icon as={LuX} />
                  </Button>
                </HStack>
              </Badge>
            ))}
          </HStack>
        ) : (
          <Text color="fg.muted">Нет организаций в whitelist</Text>
        )}
        <HStack mt={4} gap={2}>
          <NativeSelectRoot maxW="300px">
            <NativeSelectField value={selectedOrganization} onChange={(e) => onOrganizationChange(e.target.value)}>
              <option value="">Добавить в whitelist...</option>
              {organizations
                .filter((o) => !settings?.whitelist.includes(o.id))
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </NativeSelectField>
          </NativeSelectRoot>
          <Button size="sm" colorPalette="green" disabled={!selectedOrganization} onClick={onAdd}>
            Добавить
          </Button>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
