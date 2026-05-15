'use client'

/**
 * Форма создания/редактирования приложения
 */

import type { AppType } from '@/generated/prisma/client'
import { Box, Button, Card, createListCollection, HStack, Input, Select, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuX } from 'react-icons/lu'
import type { AppFormData } from '../_types'

const appTypeCollection = createListCollection({
  items: [
    { value: 'WEB', label: 'WEB' },
    { value: 'CLI', label: 'CLI' },
    { value: 'SERVICE', label: 'SERVICE' },
  ],
})

interface AppFormProps {
  form: AppFormData
  isEditing: boolean
  isSaving: boolean
  onFormChange: (form: AppFormData) => void
  onSave: () => void
  onCancel: () => void
}

export function AppForm({ form, isEditing, isSaving, onFormChange, onSave, onCancel }: AppFormProps) {
  return (
    <Card.Root mb="4">
      <Card.Header py="2">
        <Text fontSize="sm" fontWeight="medium">
          {isEditing ? 'Редактировать приложение' : 'Новое приложение'}
        </Text>
      </Card.Header>
      <Card.Body>
        <VStack gap="3" align="stretch">
          <HStack gap="3" flexWrap="wrap">
            <Box flex="1" minW="150px">
              <Text fontSize="xs" mb="1">
                Имя (slug)
              </Text>
              <Input
                size="sm"
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="premium-rosstil"
              />
            </Box>
            <Box flex="1" minW="150px">
              <Text fontSize="xs" mb="1">
                Отображаемое имя
              </Text>
              <Input
                size="sm"
                value={form.displayName}
                onChange={(e) => onFormChange({ ...form, displayName: e.target.value })}
                placeholder="Premium Rosstil"
              />
            </Box>
          </HStack>

          <HStack gap="3" flexWrap="wrap">
            <Box flex="2" minW="150px">
              <Text fontSize="xs" mb="1">
                Контейнер
              </Text>
              <Input
                size="sm"
                value={form.containerName}
                onChange={(e) => onFormChange({ ...form, containerName: e.target.value })}
                placeholder="premium-rosstil"
              />
            </Box>
            <Box flex="1" minW="80px">
              <Text fontSize="xs" mb="1">
                Порт
              </Text>
              <Input
                size="sm"
                type="number"
                value={form.port}
                onChange={(e) => onFormChange({ ...form, port: e.target.value })}
                placeholder="3000"
              />
            </Box>
            <Box flex="1" minW="100px">
              <Text fontSize="xs" mb="1">
                Тип
              </Text>
              <Select.Root
                collection={appTypeCollection}
                size="sm"
                value={[form.type]}
                onValueChange={(e) => onFormChange({ ...form, type: e.value[0] as AppType })}
              >
                <Select.Trigger>
                  <Select.ValueText />
                </Select.Trigger>
                <Select.Content>
                  {appTypeCollection.items.map((item) => (
                    <Select.Item key={item.value} item={item}>
                      {item.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Box>
          </HStack>

          <Box>
            <Text fontSize="xs" mb="1">
              Docker образ (для pull)
            </Text>
            <Input
              size="sm"
              value={form.imageName}
              onChange={(e) => onFormChange({ ...form, imageName: e.target.value })}
              placeholder="lena/premium-rosstil:latest"
            />
          </Box>

          <HStack gap="2">
            <Button size="sm" colorPalette="green" onClick={onSave} loading={isSaving}>
              <LuCheck />
              {isEditing ? 'Сохранить' : 'Добавить'}
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>
              <LuX />
              Отмена
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
