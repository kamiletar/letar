'use client'

import { toaster } from '@/app/_components/ui/toaster'
import type { Article, ArticleCategory } from '@/hooks/use-fashion-blog'
import { CATEGORY_CONFIG, useFashionBlog } from '@/hooks/use-fashion-blog'
import { Link } from '@/i18n/navigation'
import { Badge, Box, Button, Card, Container, Grid, Heading, HStack, Icon, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FaBookmark, FaBookOpen, FaClock, FaRegBookmark, FaSearch, FaTimes } from 'react-icons/fa'

export default function BlogPage() {
  const {
    articles,
    savedCount,
    isLoading,
    getArticlesByCategory,
    getArticlesByTag,
    searchArticles,
    saveArticle,
    unsaveArticle,
    isArticleSaved,
    getSavedArticles,
    getAllTags,
  } = useFashionBlog()

  const [selectedCategory, setSelectedCategory] = useState<ArticleCategory | 'all' | 'saved'>('all')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleToggleSave = async (slug: string) => {
    if (isArticleSaved(slug)) {
      await unsaveArticle(slug)
      toaster.success({ title: 'Статья удалена из сохранённых' })
    } else {
      await saveArticle(slug)
      toaster.success({ title: 'Статья сохранена для оффлайн чтения' })
    }
  }

  if (isLoading) {
    return (
      <Container maxW="6xl" py={8}>
        <Text>Загрузка...</Text>
      </Container>
    )
  }

  // Фильтрация статей
  let filteredArticles: Article[] = []

  if (searchQuery) {
    filteredArticles = searchArticles(searchQuery)
  } else if (selectedCategory === 'saved') {
    filteredArticles = getSavedArticles()
  } else if (selectedTag) {
    filteredArticles = getArticlesByTag(selectedTag)
  } else if (selectedCategory !== 'all') {
    filteredArticles = getArticlesByCategory(selectedCategory)
  } else {
    filteredArticles = articles
  }

  const allTags = getAllTags()

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <HStack justify="space-between" flexWrap="wrap" gap={4}>
          <VStack align="start" gap={1}>
            <Heading size="xl">
              <Icon as={FaBookOpen} mr={3} />
              Блог о моде
            </Heading>
            <Text color="fg.muted">Полезные статьи о стиле, трендах и уходе за одеждой</Text>
          </VStack>
          <Button
            variant={selectedCategory === 'saved' ? 'solid' : 'outline'}
            colorPalette={selectedCategory === 'saved' ? 'fg' : 'gray'}
            onClick={() => {
              setSelectedCategory(selectedCategory === 'saved' ? 'all' : 'saved')
              setSelectedTag(null)
              setSearchQuery('')
            }}
          >
            <Icon as={selectedCategory === 'saved' ? FaBookmark : FaRegBookmark} mr={2} />
            Сохранённые {savedCount > 0 && `(${savedCount})`}
          </Button>
        </HStack>

        {/* Поиск */}
        <Box position="relative">
          <Input
            placeholder="Поиск статей..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              if (e.target.value) {
                setSelectedCategory('all')
                setSelectedTag(null)
              }
            }}
            pl={10}
          />
          <Icon as={FaSearch} position="absolute" left={3} top="50%" transform="translateY(-50%)" color="fg.muted" />
          {searchQuery && (
            <Button
              position="absolute"
              right={1}
              top="50%"
              transform="translateY(-50%)"
              size="xs"
              variant="ghost"
              onClick={() => setSearchQuery('')}
            >
              <Icon as={FaTimes} />
            </Button>
          )}
        </Box>

        {/* Категории */}
        {!searchQuery && selectedCategory !== 'saved' && (
          <Card.Root>
            <Card.Body>
              <VStack gap={4} align="stretch">
                {/* Категории */}
                <VStack align="start" gap={2}>
                  <Text fontWeight="medium" fontSize="sm">
                    Категории
                  </Text>
                  <HStack gap={2} flexWrap="wrap">
                    <Button
                      size="sm"
                      variant={selectedCategory === 'all' && !selectedTag ? 'solid' : 'outline'}
                      colorPalette={selectedCategory === 'all' && !selectedTag ? 'fg' : 'gray'}
                      onClick={() => {
                        setSelectedCategory('all')
                        setSelectedTag(null)
                      }}
                    >
                      Все статьи
                    </Button>
                    {(
                      Object.entries(CATEGORY_CONFIG) as [ArticleCategory, (typeof CATEGORY_CONFIG)[ArticleCategory]][]
                    ).map(([cat, config]) => (
                      <Button
                        key={cat}
                        size="sm"
                        variant={selectedCategory === cat ? 'solid' : 'outline'}
                        colorPalette={selectedCategory === cat ? 'fg' : 'gray'}
                        onClick={() => {
                          setSelectedCategory(cat)
                          setSelectedTag(null)
                        }}
                      >
                        {config.emoji} {config.name}
                      </Button>
                    ))}
                  </HStack>
                </VStack>

                {/* Теги */}
                <VStack align="start" gap={2}>
                  <Text fontWeight="medium" fontSize="sm">
                    Популярные теги
                  </Text>
                  <HStack gap={2} flexWrap="wrap">
                    {allTags.slice(0, 10).map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTag === tag ? 'solid' : 'outline'}
                        colorPalette={selectedTag === tag ? 'fg' : 'gray'}
                        cursor="pointer"
                        onClick={() => {
                          setSelectedTag(selectedTag === tag ? null : tag)
                          setSelectedCategory('all')
                        }}
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </HStack>
                </VStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {/* Активные фильтры */}
        {(searchQuery || selectedTag) && (
          <HStack gap={2}>
            <Text fontSize="sm" color="fg.muted">
              Фильтры:
            </Text>
            {searchQuery && (
              <Badge colorPalette="blue">
                Поиск: "{searchQuery}"
                <Button size="xs" variant="ghost" ml={1} p={0} minW="auto" h="auto" onClick={() => setSearchQuery('')}>
                  <Icon as={FaTimes} boxSize={3} />
                </Button>
              </Badge>
            )}
            {selectedTag && (
              <Badge colorPalette="purple">
                #{selectedTag}
                <Button
                  size="xs"
                  variant="ghost"
                  ml={1}
                  p={0}
                  minW="auto"
                  h="auto"
                  onClick={() => setSelectedTag(null)}
                >
                  <Icon as={FaTimes} boxSize={3} />
                </Button>
              </Badge>
            )}
          </HStack>
        )}

        {/* Количество результатов */}
        <Text color="fg.muted" fontSize="sm">
          {selectedCategory === 'saved' ? 'Сохранённых статей' : 'Найдено статей'}: {filteredArticles.length}
        </Text>

        {/* Сетка статей */}
        {filteredArticles.length === 0 ? (
          <Card.Root>
            <Card.Body py={12} textAlign="center">
              <VStack gap={4}>
                <Icon as={selectedCategory === 'saved' ? FaBookmark : FaBookOpen} boxSize={12} color="fg.muted" />
                <Text color="fg.muted">
                  {selectedCategory === 'saved'
                    ? 'Вы ещё не сохранили ни одной статьи'
                    : searchQuery
                      ? 'Статьи по вашему запросу не найдены'
                      : 'Статьи не найдены'}
                </Text>
                {selectedCategory === 'saved' && (
                  <Button variant="outline" onClick={() => setSelectedCategory('all')}>
                    Смотреть все статьи
                  </Button>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        ) : (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
            {filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                isSaved={isArticleSaved(article.slug)}
                onToggleSave={() => handleToggleSave(article.slug)}
              />
            ))}
          </Grid>
        )}
      </VStack>
    </Container>
  )
}

/**
 * Карточка статьи
 */
function ArticleCard({
  article,
  isSaved,
  onToggleSave,
}: {
  article: Article
  isSaved: boolean
  onToggleSave: () => void
}) {
  const categoryConfig = CATEGORY_CONFIG[article.category]

  return (
    <Card.Root overflow="hidden" _hover={{ shadow: 'lg' }} transition="all 0.2s">
      {/* Обложка */}
      <Box position="relative">
        <Box aspectRatio={16 / 9} bg="bg.subtle" display="flex" alignItems="center" justifyContent="center">
          <Icon as={FaBookOpen} boxSize={12} color="fg.muted" />
        </Box>

        {/* Категория */}
        <Badge position="absolute" top={2} left={2} colorPalette="blackAlpha" bg="blackAlpha.700" color="white">
          {categoryConfig.emoji} {categoryConfig.name}
        </Badge>

        {/* Кнопка сохранения */}
        <Button
          position="absolute"
          top={2}
          right={2}
          size="sm"
          variant="solid"
          bg={isSaved ? 'yellow.500' : 'blackAlpha.600'}
          color="white"
          _hover={{ bg: isSaved ? 'yellow.600' : 'blackAlpha.700' }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleSave()
          }}
        >
          <Icon as={isSaved ? FaBookmark : FaRegBookmark} />
        </Button>
      </Box>

      <Card.Body p={4}>
        <VStack align="stretch" gap={3}>
          {/* Время чтения */}
          <HStack gap={2} fontSize="xs" color="fg.muted">
            <Icon as={FaClock} />
            <Text>{article.readTime} мин чтения</Text>
            <Text>•</Text>
            <Text>
              {new Date(article.publishedAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
          </HStack>

          {/* Заголовок */}
          <Link href={`/blog/${article.slug}`}>
            <Heading size="md" _hover={{ color: 'fg.muted' }} transition="color 0.2s" cursor="pointer">
              {article.title}
            </Heading>
          </Link>

          {/* Краткое описание */}
          <Text fontSize="sm" color="fg.muted" lineClamp={3}>
            {article.excerpt}
          </Text>

          {/* Теги */}
          <HStack gap={1} flexWrap="wrap">
            {article.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="subtle" size="sm">
                #{tag}
              </Badge>
            ))}
          </HStack>

          {/* Кнопка читать */}
          <Button asChild variant="outline" size="sm" mt={2}>
            <Link href={`/blog/${article.slug}`}>Читать статью</Link>
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
