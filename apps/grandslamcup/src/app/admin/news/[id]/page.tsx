'use client'

/**
 * Редактирование новости — админка
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Checkbox, Field, Flex, Heading, Input, Spinner, Textarea, VStack } from '@chakra-ui/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LuArrowLeft, LuSave } from 'react-icons/lu'
import { getNewsPostAction, updateNewsAction } from '../_actions/news.action'

export default function EditNewsPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    published: false,
  })

  useEffect(() => {
    getNewsPostAction(id).then((result) => {
      if ('data' in result && result.data) {
        const d = result.data
        setForm({
          title: d.title,
          slug: d.slug,
          content: d.content,
          excerpt: d.excerpt ?? '',
          coverImage: d.coverImage ?? '',
          published: d.published,
        })
      }
      setLoading(false)
    })
  }, [id])

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = await updateNewsAction(id, form)
    if ('error' in result) {
      toaster.error({ title: String(result.error) })
    } else {
      toaster.success({ title: 'Новость обновлена' })
      router.push('/admin/news')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <Flex justify="center" py={12}>
        <Spinner size="lg" />
      </Flex>
    )
  }

  return (
    <VStack gap={6} align="stretch" maxW="800px">
      <Flex align="center" gap={3}>
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin/news')}>
          <LuArrowLeft size={16} />
        </Button>
        <Heading size="lg">Редактировать новость</Heading>
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
              <Input value={form.coverImage} onChange={(e) => update('coverImage', e.target.value)} />
            </Field.Root>

            <Checkbox.Root checked={form.published} onCheckedChange={(e) => update('published', !!e.checked)}>
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>Опубликован</Checkbox.Label>
            </Checkbox.Root>

            <Flex justify="flex-end" gap={3} pt={2}>
              <Button variant="outline" onClick={() => router.push('/admin/news')}>
                Отмена
              </Button>
              <Button type="submit" colorPalette="brand" loading={saving}>
                <LuSave size={16} /> Сохранить
              </Button>
            </Flex>
          </VStack>
        </form>
      </Box>
    </VStack>
  )
}
