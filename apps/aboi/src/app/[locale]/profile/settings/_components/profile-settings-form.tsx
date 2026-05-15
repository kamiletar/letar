'use client'

import { Box, Button, Heading, Input, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteAccountAction, updateProfileSettingsAction } from '../../_actions/profile.action'

export function ProfileSettingsForm({
  email,
  name: initialName,
  phone: initialPhone,
}: {
  email: string
  name: string
  phone: string
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function save() {
    setMessage(null)
    startSave(async () => {
      const result = await updateProfileSettingsAction({ name, phone: phone || null })
      if (!result.ok) {
        setMessage(result.error ?? 'Ошибка сохранения')
        return
      }
      setMessage('Сохранено')
      router.refresh()
    })
  }

  function deleteAccount() {
    if (
      !confirm(
        'Удалить аккаунт? Это действие необратимо. Заказы сохранятся в обезличенном виде для отчётности (152-ФЗ).',
      )
    ) {
      return
    }
    startDelete(async () => {
      const result = await deleteAccountAction()
      if (!result.ok) {
        setMessage(result.error ?? 'Ошибка удаления')
        return
      }
      router.push('/')
      router.refresh()
    })
  }

  return (
    <Stack gap={8}>
      <Stack gap={3}>
        <Stack gap={1}>
          <Text fontSize="sm" color="fg.muted">Email</Text>
          <Input value={email} disabled />
          <Text fontSize="xs" color="fg.muted">Email менять нельзя — это идентификатор учётной записи.</Text>
        </Stack>

        <Stack gap={1}>
          <Text fontSize="sm" color="fg.muted">Имя</Text>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Stack>

        <Stack gap={1}>
          <Text fontSize="sm" color="fg.muted">Телефон</Text>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (000) 000-00-00" />
        </Stack>

        {message && (
          <Box bg="bg.subtle" p={3} borderRadius="md" fontSize="sm" color={message === 'Сохранено' ? 'green.fg' : 'red.fg'}>
            {message}
          </Box>
        )}

        <Button alignSelf="flex-start" colorPalette="brand" onClick={save} loading={saving}>
          Сохранить
        </Button>
      </Stack>

      <Stack gap={3} p={5} borderWidth="1px" borderColor="red.muted" borderRadius="xl">
        <Heading as="h2" size="md" color="red.fg">
          Опасная зона
        </Heading>
        <Text fontSize="sm" color="fg.muted">
          Удаление аккаунта — окончательное. Заказы сохраняются в обезличенном виде согласно 152-ФЗ
          для целей отчётности.
        </Text>
        <Button alignSelf="flex-start" colorPalette="red" variant="outline" onClick={deleteAccount} loading={deleting}>
          Удалить аккаунт
        </Button>
      </Stack>
    </Stack>
  )
}
