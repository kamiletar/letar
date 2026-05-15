'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { CATEGORY_CONFIG, useFashionBlog } from '@/hooks/use-fashion-blog'
import { Link } from '@/i18n/navigation'
import { Badge, Box, Button, Card, Container, Grid, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { use, useEffect } from 'react'
import { FaArrowLeft, FaBookmark, FaBookOpen, FaClock, FaRegBookmark, FaUser } from 'react-icons/fa'

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>
}

export default function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = use(params)
  const { getArticleBySlug, getRelatedArticles, saveArticle, unsaveArticle, isArticleSaved, markAsRead } =
    useFashionBlog()

  const article = getArticleBySlug(slug)

  // Отметить как прочитанную
  useEffect(() => {
    if (article) {
      markAsRead(article.slug)
    }
  }, [article, markAsRead])

  if (!article) {
    notFound()
  }

  const categoryConfig = CATEGORY_CONFIG[article.category]
  const relatedArticles = getRelatedArticles(article.slug)
  const isSaved = isArticleSaved(article.slug)

  const handleToggleSave = async () => {
    if (isSaved) {
      await unsaveArticle(article.slug)
      toaster.success({ title: 'Статья удалена из сохранённых' })
    } else {
      await saveArticle(article.slug)
      toaster.success({ title: 'Статья сохранена для оффлайн чтения' })
    }
  }

  // Простой рендеринг Markdown
  const renderMarkdown = (content: string) => {
    const lines = content.split('\n')
    const elements: React.ReactNode[] = []
    let currentList: string[] = []
    let listType: 'ul' | 'ol' | 'checklist' | null = null

    const flushList = () => {
      if (currentList.length > 0 && listType) {
        if (listType === 'checklist') {
          elements.push(
            <VStack key={elements.length} align="stretch" gap={1} my={2}>
              {/* oxlint-disable-next-line eslint-plugin-react(no-array-index-key) -- Markdown парсер: элементы списка могут повторяться */}
              {currentList.map((item, i) => {
                const checked = item.startsWith('[x]')
                const text = item.replace(/^\[[ x]\]\s*/, '')
                return (
                  <HStack key={`checklist-${i}`} gap={2}>
                    <Box
                      w={4}
                      h={4}
                      borderWidth="1px"
                      borderRadius="sm"
                      bg={checked ? 'green.500' : 'transparent'}
                      color="white"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="xs"
                    >
                      {checked ? '✓' : ''}
                    </Box>
                    <Text fontSize="sm">{text}</Text>
                  </HStack>
                )
              })}
            </VStack>
          )
        } else {
          const ListTag = listType === 'ol' ? 'ol' : 'ul'
          elements.push(
            <Box
              key={elements.length}
              as={ListTag}
              pl={6}
              my={2}
              css={{
                '& li': { marginBottom: '0.25rem' },
              }}
            >
              {/* oxlint-disable-next-line eslint-plugin-react(no-array-index-key) -- Markdown парсер: элементы списка могут повторяться */}
              {currentList.map((item, i) => (
                <li key={`list-${i}`}>{item}</li>
              ))}
            </Box>
          )
        }
        currentList = []
        listType = null
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Заголовки
      if (line.startsWith('# ')) {
        flushList()
        elements.push(
          <Heading key={i} size="xl" mt={6} mb={4}>
            {line.substring(2)}
          </Heading>
        )
        continue
      }
      if (line.startsWith('## ')) {
        flushList()
        elements.push(
          <Heading key={i} size="lg" mt={6} mb={3}>
            {line.substring(3)}
          </Heading>
        )
        continue
      }
      if (line.startsWith('### ')) {
        flushList()
        elements.push(
          <Heading key={i} size="md" mt={4} mb={2}>
            {line.substring(4)}
          </Heading>
        )
        continue
      }

      // Горизонтальная линия
      if (line === '---') {
        flushList()
        elements.push(<Box key={i} borderBottomWidth="1px" borderColor="border.muted" my={6} />)
        continue
      }

      // Чеклист
      if (line.match(/^- \[[ x]\]/)) {
        if (listType !== 'checklist') {
          flushList()
          listType = 'checklist'
        }
        currentList.push(line.substring(2))
        continue
      }

      // Маркированный список
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (listType !== 'ul') {
          flushList()
          listType = 'ul'
        }
        currentList.push(line.substring(2))
        continue
      }

      // Нумерованный список
      if (line.match(/^\d+\.\s/)) {
        if (listType !== 'ol') {
          flushList()
          listType = 'ol'
        }
        currentList.push(line.replace(/^\d+\.\s/, ''))
        continue
      }

      // Цитата/выделение
      if (line.startsWith('**') && line.endsWith('**')) {
        flushList()
        elements.push(
          <Text key={i} fontWeight="bold" my={2}>
            {line.slice(2, -2)}
          </Text>
        )
        continue
      }

      // Подсказка/совет
      if (line.startsWith('**Совет:**') || line.startsWith('**Важно:**')) {
        flushList()
        const isImportant = line.startsWith('**Важно:**')
        elements.push(
          <Box key={i} p={4} bg={isImportant ? 'orange.subtle' : 'yellow.subtle'} borderRadius="md" my={4}>
            <Text fontSize="sm">
              {isImportant ? '⚠️ ' : '💡 '}
              {line.replace(/^\*\*(Совет|Важно):\*\*\s*/, '')}
            </Text>
          </Box>
        )
        continue
      }

      // Эмодзи линии (❌ или ✅)
      if (line.startsWith('❌') || line.startsWith('✅')) {
        flushList()
        elements.push(
          <Text key={i} fontSize="sm" my={1}>
            {line}
          </Text>
        )
        continue
      }

      // Пустая строка
      if (!line.trim()) {
        flushList()
        continue
      }

      // Обычный параграф
      flushList()
      // Обработка inline форматирования
      let text = line
      // Bold
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>')

      elements.push(<Text key={i} my={2} dangerouslySetInnerHTML={{ __html: text }} />)
    }

    flushList()
    return elements
  }

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Навигация */}
        <HStack justify="space-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/blog">
              <Icon as={FaArrowLeft} mr={2} />
              Все статьи
            </Link>
          </Button>
          <Button
            variant={isSaved ? 'solid' : 'outline'}
            colorPalette={isSaved ? 'yellow' : 'gray'}
            size="sm"
            onClick={handleToggleSave}
          >
            <Icon as={isSaved ? FaBookmark : FaRegBookmark} mr={2} />
            {isSaved ? 'Сохранено' : 'Сохранить'}
          </Button>
        </HStack>

        {/* Заголовок статьи */}
        <VStack align="start" gap={4}>
          <Badge colorPalette="fg">
            {categoryConfig.emoji} {categoryConfig.name}
          </Badge>

          <Heading size="2xl">{article.title}</Heading>

          <Text fontSize="lg" color="fg.muted">
            {article.excerpt}
          </Text>

          {/* Мета информация */}
          <HStack gap={4} flexWrap="wrap" fontSize="sm" color="fg.muted">
            <HStack gap={2}>
              <Icon as={FaUser} />
              <Text>{article.author.name}</Text>
              <Text>•</Text>
              <Text>{article.author.role}</Text>
            </HStack>
            <HStack gap={2}>
              <Icon as={FaClock} />
              <Text>{article.readTime} мин чтения</Text>
            </HStack>
            <Text>
              {new Date(article.publishedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </HStack>

          {/* Теги */}
          <HStack gap={2} flexWrap="wrap">
            {article.tags.map((tag) => (
              <Badge key={tag} variant="subtle" asChild>
                <Link href={`/blog?tag=${tag}`}>#{tag}</Link>
              </Badge>
            ))}
          </HStack>
        </VStack>

        {/* Обложка */}
        <Box
          aspectRatio={16 / 9}
          bg="bg.subtle"
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Icon as={FaBookOpen} boxSize={16} color="fg.muted" />
        </Box>

        {/* Контент статьи */}
        <Box
          className="article-content"
          css={{
            '& h1': { fontSize: '1.875rem', fontWeight: 'bold' },
            '& h2': { fontSize: '1.5rem', fontWeight: 'bold' },
            '& h3': { fontSize: '1.25rem', fontWeight: 'semibold' },
            '& p': { lineHeight: 1.7 },
            '& strong': { fontWeight: 'bold' },
            '& em': { fontStyle: 'italic' },
            '& ul, & ol': { paddingLeft: '1.5rem' },
            '& li': { marginBottom: '0.5rem' },
          }}
        >
          {renderMarkdown(article.content)}
        </Box>

        {/* Разделитель */}
        <Box borderBottomWidth="1px" borderColor="border.muted" my={4} />

        {/* Автор */}
        <Card.Root>
          <Card.Body>
            <HStack gap={4}>
              <Box
                w={16}
                h={16}
                borderRadius="full"
                bg="bg.muted"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Icon as={FaUser} boxSize={6} color="fg.muted" />
              </Box>
              <VStack align="start" gap={1}>
                <Text fontWeight="bold">{article.author.name}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {article.author.role}
                </Text>
              </VStack>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Похожие статьи */}
        {relatedArticles.length > 0 && (
          <VStack align="stretch" gap={4}>
            <Heading size="lg">Похожие статьи</Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
              {relatedArticles.map((related) => {
                const relatedCategory = CATEGORY_CONFIG[related.category]
                return (
                  <Card.Root key={related.id} asChild _hover={{ shadow: 'md' }} transition="all 0.2s">
                    <Link href={`/blog/${related.slug}`}>
                      <Card.Body>
                        <VStack align="start" gap={2}>
                          <Badge variant="subtle" size="sm">
                            {relatedCategory.emoji} {relatedCategory.name}
                          </Badge>
                          <Text fontWeight="medium" lineClamp={2}>
                            {related.title}
                          </Text>
                          <HStack gap={2} fontSize="xs" color="fg.muted">
                            <Icon as={FaClock} />
                            <Text>{related.readTime} мин</Text>
                          </HStack>
                        </VStack>
                      </Card.Body>
                    </Link>
                  </Card.Root>
                )
              })}
            </Grid>
          </VStack>
        )}

        {/* Навигация внизу */}
        <HStack justify="space-between" pt={4}>
          <Button asChild variant="outline">
            <Link href="/blog">
              <Icon as={FaArrowLeft} mr={2} />
              Все статьи
            </Link>
          </Button>
          <Button
            variant={isSaved ? 'solid' : 'outline'}
            colorPalette={isSaved ? 'yellow' : 'fg'}
            onClick={handleToggleSave}
          >
            <Icon as={isSaved ? FaBookmark : FaRegBookmark} mr={2} />
            {isSaved ? 'Сохранено' : 'Сохранить для оффлайн'}
          </Button>
        </HStack>
      </VStack>
    </Container>
  )
}
