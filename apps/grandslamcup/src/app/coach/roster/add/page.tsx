'use client'

/**
 * Добавление нового игрока — мгновенное, без модерации.
 * Тренер сам формирует состав команды.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { addNewPlayerAction } from '@/app/coach/_actions/roster.action'
import { Box, Button, Field, Flex, Heading, Input, NativeSelect, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuArrowLeft, LuPlus } from 'react-icons/lu'

export default function AddPlayerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    playerName: '',
    playerCity: '',
    playerTelegram: '',
    playerVk: '',
    playerBio: '',
    role: 'PLAYER' as string,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.playerName.trim()) {
      toaster.error({ title: 'Укажите имя игрока' })
      return
    }

    setLoading(true)
    try {
      const result = await addNewPlayerAction(form)
      if ('error' in result) {
        toaster.error({ title: String(result.error) })
      } else {
        toaster.success({ title: 'Игрок добавлен в состав' })
        router.push('/coach/roster')
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <VStack gap={6} align="stretch" maxW="600px">
      <Flex align="center" gap={3}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/coach/roster')}>
          <LuArrowLeft size={16} />
        </Button>
        <Heading size="lg">Добавить игрока</Heading>
      </Flex>

      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={6}>
        <Text fontSize="sm" color="fg.muted" mb={4}>
          Игрок будет сразу добавлен в состав команды.
        </Text>

        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Имя поэта</Field.Label>
              <Input
                placeholder="Иванов Иван"
                value={form.playerName}
                onChange={(e) => update('playerName', e.target.value)}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Город</Field.Label>
              <Input
                placeholder="Санкт-Петербург"
                value={form.playerCity}
                onChange={(e) => update('playerCity', e.target.value)}
              />
            </Field.Root>

            <Flex gap={4} direction={{ base: 'column', sm: 'row' }}>
              <Field.Root flex={1}>
                <Field.Label>Telegram</Field.Label>
                <Input
                  placeholder="@username"
                  value={form.playerTelegram}
                  onChange={(e) => update('playerTelegram', e.target.value)}
                />
              </Field.Root>

              <Field.Root flex={1}>
                <Field.Label>VK</Field.Label>
                <Input
                  placeholder="https://vk.com/..."
                  value={form.playerVk}
                  onChange={(e) => update('playerVk', e.target.value)}
                />
              </Field.Root>
            </Flex>

            <Field.Root>
              <Field.Label>Роль</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={form.role} onChange={(e) => update('role', e.target.value)}>
                  <option value="PLAYER">Игрок</option>
                  <option value="COACH">Тренер</option>
                  <option value="ASSISTANT_COACH">Зам. тренера</option>
                </NativeSelect.Field>
              </NativeSelect.Root>
            </Field.Root>

            <Field.Root>
              <Field.Label>Биография</Field.Label>
              <Textarea
                placeholder="Краткая информация о поэте..."
                value={form.playerBio}
                onChange={(e) => update('playerBio', e.target.value)}
                rows={3}
              />
            </Field.Root>

            <Flex justify="flex-end" gap={3} pt={2}>
              <Button variant="outline" onClick={() => router.push('/coach/roster')}>
                Отмена
              </Button>
              <Button type="submit" colorPalette="teal" loading={loading}>
                <LuPlus size={16} />
                Добавить
              </Button>
            </Flex>
          </VStack>
        </form>
      </Box>
    </VStack>
  )
}
