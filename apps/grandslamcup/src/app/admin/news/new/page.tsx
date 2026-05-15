'use client'

/**
 * Создание новости — админка
 */

import { toaster } from '@/app/_components/ui/toaster'
import { transliterate } from '@/lib/transliterate'
import { Box, Button, Checkbox, Field, Flex, Heading, Input, NativeSelect, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuSave } from 'react-icons/lu'
import { createNewsAction } from '../_actions/news.action'

interface CityOption {
  id: string
  name: string
}

export default function NewNewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<CityOption[]>([])
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    cityId: '',
    published: false,
  })

  useEffect(() => {
    fetch('/api/admin/cities')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCities(data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })))
        }
      })
      .catch(() => {
        /* игнорируем ошибку загрузки городов */
      })
  }, [])

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === 'title' && typeof value === 'string') {
      setForm((prev) => ({ ...prev, slug: transliterate(value) }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await createNewsAction(form)
    if ('error' in result) {
      toaster.error({ title: String(result.error) })
    } else {
      toaster.success({ title: 'Новость создана' })
      router.push('/admin/news')
    }
    setLoading(false)
  }

  return (
    <VStack gap={6} align="stretch" maxW="800px">
      <Flex align="center" gap={3}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/news')}>
          <LuArrowLeft size={16} />
        </Button>
        <Heading size="lg">Новая новость</Heading>
      </Flex>

      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" p={6}>
        <form onSubmit={handleSubmit}>
          <VStack gap={4} align="stretch">
            <Field.Root required>
              <Field.Label>Заголовок</Field.Label>
              <Input value={form.title} onChange={(e) => update('title', e.target.value)} />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Slug (URL)</Field.Label>
              <Input value={form.slug} onChange={(e) => update('slug', e.target.value)} />
            </Field.Root>

            <Field.Root>
              <Field.Label>Краткое описание</Field.Label>
              <Textarea value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} rows={2} />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Контент (Markdown)</Field.Label>
              <Textarea
                value={form.content}
                onChange={(e) => update('content', e.target.value)}
                rows={15}
                fontFamily="mono"
                fontSize="sm"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Обложка (URL)</Field.Label>
              <Input
                value={form.coverImage}
                onChange={(e) => update('coverImage', e.target.value)}
                placeholder="/api/files/..."
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Город</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={form.cityId} onChange={(e) => update('cityId', e.target.value)}>
                  <option value="">— Без города —</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>

            <Checkbox.Root checked={form.published} onCheckedChange={(e) => update('published', !!e.checked)}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Опубликовать сразу</Checkbox.Label>
            </Checkbox.Root>

            <Flex justify="flex-end" gap={3} pt={2}>
              <Button variant="outline" onClick={() => router.push('/admin/news')}>
                Отмена
              </Button>
              <Button type="submit" colorPalette="brand" loading={loading}>
                <LuSave size={16} /> Создать
              </Button>
            </Flex>
          </VStack>
        </form>
      </Box>
    </VStack>
  )
}
