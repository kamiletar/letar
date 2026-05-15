'use client'

import { Box, Button, Card, Field, Heading, HStack, Icon, Input } from '@chakra-ui/react'
import { LuSettings } from 'react-icons/lu'

import { NativeSelectField, NativeSelectRoot } from '@/app/_components/ui/native-select'

import type { Organization } from './types'

interface CustomLimitFormProps {
  organizations: Organization[]
  selectedOrganization: string
  customLimit: string
  onOrganizationChange: (value: string) => void
  onLimitChange: (value: string) => void
  onSubmit: () => void
  loading: boolean
}

/**
 * Форма добавления кастомного лимита.
 */
export function CustomLimitForm({
  organizations,
  selectedOrganization,
  customLimit,
  onOrganizationChange,
  onLimitChange,
  onSubmit,
  loading,
}: CustomLimitFormProps) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack>
          <Icon as={LuSettings} />
          <Heading size="md">Установить кастомный лимит</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <HStack gap={4} flexWrap="wrap">
          <Field.Root flex={1} minW="200px">
            <Field.Label>Организация</Field.Label>
            <NativeSelectRoot>
              <NativeSelectField value={selectedOrganization} onChange={(e) => onOrganizationChange(e.target.value)}>
                <option value="">Выберите организацию</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
          </Field.Root>
          <Field.Root w="120px">
            <Field.Label>Лимит/мин</Field.Label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={customLimit}
              onChange={(e) => onLimitChange(e.target.value)}
              placeholder="100"
            />
          </Field.Root>
          <Box pt={6}>
            <Button colorPalette="brand" onClick={onSubmit} loading={loading}>
              Установить
            </Button>
          </Box>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
