'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { Box, Button, ColorSwatch, Fieldset, HStack, Input, Stack, Text, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { createColor, updateColor } from '../_actions/color.action'
import type { ColorFormData } from '../_schemas/color.schema'

interface ColorFormProps {
  /** Режим редактирования */
  mode: 'create' | 'edit'
  /** ID цвета (для редактирования) */
  colorId?: string
  /** Начальные данные */
  defaultValues?: ColorFormData
}

/**
 * Генерирует slug из названия цвета
 */
function generateSlug(name: string): string {
  const translitMap: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'yo',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'yu',
    я: 'ya',
  }

  return name
    .toLowerCase()
    .split('')
    .map((char) => translitMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function ColorForm({ mode, colorId, defaultValues }: ColorFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState(defaultValues?.name ?? '')
  const [slug, setSlug] = useState(defaultValues?.slug ?? '')
  const [hex, setHex] = useState(defaultValues?.hex ?? '#CA9E67')
  const [autoSlug, setAutoSlug] = useState(mode === 'create')

  const handleNameChange = (value: string) => {
    setName(value)
    if (autoSlug) {
      setSlug(generateSlug(value))
    }
  }

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
    setAutoSlug(false)
  }

  const handleSubmit = () => {
    if (!name || !slug || !hex) {
      toaster.error({ title: 'Заполните все поля' })
      return
    }

    const data: ColorFormData = { name, slug, hex }

    startTransition(async () => {
      const result = mode === 'create' ? await createColor(data) : await updateColor(colorId!, data)

      if (result.success) {
        toaster.success({
          title: mode === 'create' ? 'Цвет создан' : 'Цвет обновлён',
        })
        router.push('/admin/colors')
      } else {
        toaster.error({ title: 'Ошибка', description: result.error })
      }
    })
  }

  return (
    <VStack align="stretch" gap={6}>
      <Fieldset.Root>
        <Fieldset.Content>
          <Stack gap={4}>
            {/* Название */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Название *
              </Text>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Например: Золотой"
                disabled={isPending}
              />
            </Box>

            {/* Slug */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                Slug *
              </Text>
              <Input
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="Например: gold"
                disabled={isPending}
              />
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Используется в URL для фильтрации: /catalog?color={slug || 'slug'}
              </Text>
            </Box>

            {/* HEX с превью */}
            <Box>
              <Text fontWeight="medium" mb={2}>
                HEX код *
              </Text>
              <HStack gap={3}>
                <Input
                  value={hex}
                  onChange={(e) => setHex(e.target.value.toUpperCase())}
                  placeholder="#CA9E67"
                  maxWidth="150px"
                  disabled={isPending}
                />
                <input
                  type="color"
                  value={hex}
                  onChange={(e) => setHex(e.target.value.toUpperCase())}
                  style={{ width: 40, height: 40, padding: 0, border: 'none', cursor: 'pointer' }}
                  disabled={isPending}
                />
                <ColorSwatch value={hex} size="lg" borderRadius="full" />
              </HStack>
            </Box>
          </Stack>
        </Fieldset.Content>
      </Fieldset.Root>

      <HStack gap={3}>
        <Button onClick={handleSubmit} colorPalette="fg" loading={isPending}>
          {mode === 'create' ? 'Создать' : 'Сохранить'}
        </Button>
        <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
          Отмена
        </Button>
      </HStack>
    </VStack>
  )
}
