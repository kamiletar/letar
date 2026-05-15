'use client'

/**
 * Клиентская форма редактирования стихотворения.
 */

import { updatePoemAction } from '@/app/poet/_actions/poet.action'
import { CoverImageUpload } from '@/app/poet/poems/_components/cover-image-upload'
import { Box, Button, Checkbox, Flex, Heading, Input, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface EditPoemFormProps {
  poem: {
    id: string
    title: string
    text: string
    coverImage: string | null
    published: boolean
  }
}

export function EditPoemForm({ poem }: EditPoemFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(poem.title)
  const [text, setText] = useState(poem.text)
  const [coverImage, setCoverImage] = useState<string | null>(poem.coverImage)
  const [published, setPublished] = useState(poem.published)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await updatePoemAction({
        id: poem.id,
        title,
        text,
        coverImage: coverImage || null,
        published,
      })
      if ('error' in result && result.error) {
        setError(result.error)
      } else {
        router.push('/poet/poems')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <VStack gap={6} align="stretch" maxW="720px">
      <Heading size="lg">Редактирование стихотворения</Heading>

      <form onSubmit={handleSubmit}>
        <VStack gap={4} align="stretch">
          {/* Название */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Название
            </Text>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название стихотворения"
              required
            />
          </Box>

          {/* Текст */}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Текст
            </Text>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Текст стихотворения..."
              rows={15}
              css={{ whiteSpace: 'pre-wrap' }}
              required
            />
          </Box>

          {/* Обложка */}
          <CoverImageUpload value={coverImage} onChange={setCoverImage} poemId={poem.id} />

          {/* Публикация */}
          <Checkbox.Root checked={published} onCheckedChange={(e) => setPublished(!!e.checked)}>
            <Checkbox.HiddenInput />
            <Checkbox.Control />
            <Checkbox.Label>Опубликовано</Checkbox.Label>
          </Checkbox.Root>

          {/* Ошибка */}
          {error && (
            <Text color="red.500" fontSize="sm">
              {error}
            </Text>
          )}

          {/* Кнопки */}
          <Flex gap={3}>
            <Button type="submit" colorPalette="teal" loading={loading}>
              Сохранить
            </Button>
            <Button variant="ghost" onClick={() => router.push('/poet/poems')}>
              Отмена
            </Button>
          </Flex>
        </VStack>
      </form>
    </VStack>
  )
}
