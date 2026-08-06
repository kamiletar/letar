'use client'

import { toaster } from '@/app/_components/ui/toaster'
import {
  Alert,
  Badge,
  Box,
  Button,
  Clipboard,
  Container,
  Dialog,
  Heading,
  HStack,
  Icon,
  IconButton,
  Portal,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { LuCopy, LuKey, LuPlus, LuQrCode, LuTrash2 } from 'react-icons/lu'

import { Breadcrumbs } from '@/app/_components/breadcrumbs'
import { createApiKey, deleteApiKey } from '../_actions/api-key.action'
import { CreateApiKeySchema } from '../_schemas/create-api-key.schema'
import { MobileQRDialog } from './mobile-qr-dialog'

interface ApiKey {
  id: string
  name: string
  lastUsedAt: Date | null
  createdAt: Date
}

interface ApiKeysClientProps {
  keys: ApiKey[]
}

export function ApiKeysClient({ keys }: ApiKeysClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [createdKey, setCreatedKey] = useState<{ key: string; name: string } | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) {
      return
    }

    startTransition(async () => {
      const result = await deleteApiKey(deleteTarget.id)

      if (result.success) {
        router.refresh()
        toaster.success({ title: 'Ключ удалён' })
      } else {
        toaster.error({ title: result.error || 'Ошибка удаления' })
      }
      setDeleteTarget(null)
    })
  }

  return (
    <Box minH="100vh" bg="bg">
      {/* Хлебные крошки */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={3}>
        <Container maxW="container.lg">
          <Breadcrumbs items={[{ label: 'Профиль', href: '/profile' }, { label: 'API Ключи' }]} />
        </Container>
      </Box>

      {/* Заголовок */}
      <Container maxW="container.lg" pt={6}>
        <Heading size="lg">
          <Icon as={LuKey} mr={2} />
          API Ключи
        </Heading>
      </Container>

      <Container maxW="container.lg" py={8}>
        <VStack align="stretch" gap={6}>
          {/* Описание */}
          <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
            <Heading size="md" mb={2}>
              Публикация из Animatrona
            </Heading>
            <Text color="fg.muted">
              API ключи позволяют публиковать аниме напрямую из приложения Animatrona. Создайте ключ и добавьте его в
              настройках Animatrona (Настройки → Публикация → API Key).
            </Text>
          </Box>

          {/* Форма создания */}
          <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
            <Heading size="sm" mb={4}>
              <Icon as={LuPlus} mr={2} />
              Создать новый ключ
            </Heading>

            <Form
              schema={CreateApiKeySchema}
              initialValue={{ name: '' }}
              onSubmit={async (data) => {
                const formData = new FormData()
                formData.set('name', data.name)

                startTransition(async () => {
                  const result = await createApiKey(formData)

                  if (result.success) {
                    setCreatedKey({ key: result.key, name: data.name })
                    router.refresh()
                    toaster.success({ title: 'API ключ создан' })
                  } else {
                    toaster.error({ title: result.error })
                  }
                })
              }}
            >
              <HStack gap={4}>
                <Box maxW="400px" flex={1}>
                  <Form.Field.String name="name" />
                </Box>
                <Form.Button.Submit colorPalette="brand">Создать</Form.Button.Submit>
              </HStack>
            </Form>
          </Box>

          {/* Созданный ключ (показывается один раз!) */}
          {createdKey && (
            <Alert.Root status="success" borderRadius="xl">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Ключ создан!</Alert.Title>
                <Alert.Description>
                  <Text mb={2}>Скопируйте ключ сейчас — он больше не будет показан:</Text>
                  <Clipboard.Root value={createdKey.key}>
                    <HStack bg="bg.subtle" p={3} borderRadius="md" fontFamily="mono" fontSize="sm" gap={2}>
                      <Text flex={1} wordBreak="break-all">
                        {createdKey.key}
                      </Text>
                      <Clipboard.Trigger asChild>
                        <IconButton size="sm" variant="ghost" aria-label="Копировать">
                          <Icon as={LuCopy} />
                        </IconButton>
                      </Clipboard.Trigger>
                    </HStack>
                  </Clipboard.Root>
                  <HStack mt={2} gap={2}>
                    <Button size="sm" variant="outline" onClick={() => setShowQR(true)}>
                      <Icon as={LuQrCode} mr={1} />
                      QR для мобильного
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCreatedKey(null)}>
                      Понятно, закрыть
                    </Button>
                  </HStack>
                </Alert.Description>
              </Alert.Content>
            </Alert.Root>
          )}

          {/* QR-диалог для подключения mobile */}
          {createdKey && (
            <MobileQRDialog
              open={showQR}
              onClose={() => setShowQR(false)}
              apiKey={createdKey.key}
              keyName={createdKey.name}
            />
          )}

          {/* Список ключей */}
          <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" overflow="hidden">
            <Box p={4} borderBottomWidth="1px">
              <Heading size="sm">Ваши ключи ({keys.length}/5)</Heading>
            </Box>

            {keys.length === 0
              ? (
                <Box textAlign="center" py={12}>
                  <Icon as={LuKey} boxSize={10} color="fg.muted" mb={4} />
                  <Text color="fg.muted">У вас пока нет API ключей</Text>
                </Box>
              )
              : (
                <Table.Root>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Название</Table.ColumnHeader>
                      <Table.ColumnHeader>Последнее использование</Table.ColumnHeader>
                      <Table.ColumnHeader>Создан</Table.ColumnHeader>
                      <Table.ColumnHeader w="100px">Действия</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {keys.map((key) => (
                      <Table.Row key={key.id}>
                        <Table.Cell>
                          <HStack gap={2}>
                            <Icon as={LuKey} color="fg.muted" />
                            <Text fontWeight="medium">{key.name}</Text>
                          </HStack>
                        </Table.Cell>
                        <Table.Cell>
                          {key.lastUsedAt
                            ? (
                              <Badge colorPalette="green">
                                {new Date(key.lastUsedAt).toLocaleDateString('ru', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Badge>
                            )
                            : <Badge colorPalette="gray">Не использовался</Badge>}
                        </Table.Cell>
                        <Table.Cell>
                          <Text color="fg.muted" fontSize="sm">
                            {new Date(key.createdAt).toLocaleDateString('ru')}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <IconButton
                            aria-label="Удалить"
                            variant="ghost"
                            colorPalette="red"
                            size="sm"
                            disabled={isPending}
                            onClick={() => setDeleteTarget({ id: key.id, name: key.name })}
                          >
                            <Icon as={LuTrash2} />
                          </IconButton>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
          </Box>

          {/* Инструкция */}
          <Box bg="bg.subtle" p={6} borderRadius="xl">
            <Heading size="sm" mb={3}>
              Как использовать
            </Heading>
            <VStack align="stretch" gap={2} fontSize="sm" color="fg.muted">
              <Text>1. Создайте API ключ на этой странице</Text>
              <Text>2. В Animatrona откройте Настройки → Публикация</Text>
              <Text>3. Введите URL трекера: https://animatrona-tracker.letar.best</Text>
              <Text>4. Вставьте API ключ</Text>
              <Text>5. Теперь вы можете публиковать аниме через меню "Действия" → "Опубликовать на трекер"</Text>
            </VStack>
          </Box>
        </VStack>
      </Container>

      {/* Диалог подтверждения удаления */}
      <Dialog.Root
        open={!!deleteTarget}
        onOpenChange={(e) => {
          if (!e.open) {
            setDeleteTarget(null)
          }
        }}
        initialFocusEl={() => cancelRef.current}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Удалить API ключ</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>
                  Удалить ключ{' '}
                  <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Это действие нельзя отменить. Приложения,
                  использующие этот ключ, потеряют доступ.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button ref={cancelRef} variant="outline" onClick={() => setDeleteTarget(null)}>
                  Отмена
                </Button>
                <Button colorPalette="red" onClick={handleDeleteConfirm} loading={isPending} ml={3}>
                  Удалить
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
