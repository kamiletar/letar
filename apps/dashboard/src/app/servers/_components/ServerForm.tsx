'use client'

/**
 * Форма создания/редактирования сервера
 */

import { Box, Button, Card, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuX } from 'react-icons/lu'
import type { ServerFormData } from '../_types'

interface ServerFormProps {
  form: ServerFormData
  isEditing: boolean
  isSaving: boolean
  onFormChange: (form: ServerFormData) => void
  onSave: () => void
  onCancel: () => void
}

export function ServerForm({ form, isEditing, isSaving, onFormChange, onSave, onCancel }: ServerFormProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">{isEditing ? 'Редактировать сервер' : 'Новый сервер'}</Heading>
      </Card.Header>
      <Card.Body>
        <VStack gap="4" align="stretch">
          <HStack gap="4" flexWrap="wrap">
            <Box flex="1" minW="200px">
              <Text fontSize="sm" mb="1">
                Имя (уникальное)
              </Text>
              <Input
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                placeholder="driving-school-server"
              />
            </Box>
            <Box flex="1" minW="200px">
              <Text fontSize="sm" mb="1">
                Отображаемое имя
              </Text>
              <Input
                value={form.displayName}
                onChange={(e) => onFormChange({ ...form, displayName: e.target.value })}
                placeholder="Сервер автошколы"
              />
            </Box>
          </HStack>

          <HStack gap="4" flexWrap="wrap">
            <Box flex="2" minW="200px">
              <Text fontSize="sm" mb="1">
                Хост (IP или hostname)
              </Text>
              <Input
                value={form.host}
                onChange={(e) => onFormChange({ ...form, host: e.target.value })}
                placeholder="192.168.1.100"
              />
            </Box>
            <Box flex="1" minW="100px">
              <Text fontSize="sm" mb="1">
                Порт
              </Text>
              <Input
                type="number"
                value={form.port}
                onChange={(e) => onFormChange({ ...form, port: parseInt(e.target.value) || 3100 })}
              />
            </Box>
          </HStack>

          <Box>
            <Text fontSize="sm" mb="1">
              Токен агента (для авторизации)
            </Text>
            <Input
              type="password"
              value={form.agentToken}
              onChange={(e) => onFormChange({ ...form, agentToken: e.target.value })}
              placeholder="secret-token"
            />
          </Box>

          {/* NPM Credentials */}
          <Box pt="4" borderTopWidth="1px">
            <Text fontSize="sm" fontWeight="medium" mb="3" color="fg.muted">
              Nginx Proxy Manager (опционально)
            </Text>
            <VStack gap="3" align="stretch">
              <Box>
                <Text fontSize="sm" mb="1">
                  NPM URL
                </Text>
                <Input
                  value={form.npmUrl}
                  onChange={(e) => onFormChange({ ...form, npmUrl: e.target.value })}
                  placeholder="http://localhost:81"
                />
              </Box>
              <HStack gap="4" flexWrap="wrap">
                <Box flex="1" minW="200px">
                  <Text fontSize="sm" mb="1">
                    NPM Email
                  </Text>
                  <Input
                    value={form.npmEmail}
                    onChange={(e) => onFormChange({ ...form, npmEmail: e.target.value })}
                    placeholder="admin@example.com"
                  />
                </Box>
                <Box flex="1" minW="200px">
                  <Text fontSize="sm" mb="1">
                    NPM Password
                  </Text>
                  <Input
                    type="password"
                    value={form.npmPassword}
                    onChange={(e) => onFormChange({ ...form, npmPassword: e.target.value })}
                    placeholder="••••••••"
                  />
                </Box>
              </HStack>
            </VStack>
          </Box>

          <HStack gap="2">
            <Button colorPalette="green" onClick={onSave} loading={isSaving}>
              <LuCheck />
              {isEditing ? 'Сохранить' : 'Добавить'}
            </Button>
            <Button variant="ghost" onClick={onCancel}>
              <LuX />
              Отмена
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
