import { OptimizedImage } from '@/app/_components/ui/optimized-image'
import type { LearningItemType, LearningStatus } from '@/generated/prisma'
import { Badge, Card, Heading, HStack, Icon, Link as ChakraLink, Text, VStack } from '@chakra-ui/react'
import { ExternalLink, Star } from 'lucide-react'
import { memo } from 'react'

interface LearningCardProps {
  /** Элемент списка изученного */
  item: {
    id: string
    title: string
    titleEn: string | null
    author: string | null
    url: string | null
    coverImage: string | null
    type: LearningItemType
    category: string | null
    tags: string[]
    status: LearningStatus
    rating: number | null
    notes: string | null
    notesEn: string | null
    completedAt: Date | null
    year: number | null
    isFeatured: boolean
  }
  /** Текущая локаль */
  locale: string
  /** Иконка типа элемента */
  typeIcon: React.ReactNode
  /** Функция перевода */
  t: (key: string) => string
}

/**
 * Карточка элемента изученного материала
 */
export const LearningCard = memo(function LearningCard({ item, locale, typeIcon, t }: LearningCardProps) {
  const title = locale === 'ru' ? item.title : item.titleEn || item.title
  const notes = locale === 'ru' ? item.notes : item.notesEn || item.notes

  return (
    <Card.Root overflow="hidden">
      {item.coverImage && <OptimizedImage src={item.coverImage} alt={title} height="160px" width="100%" />}
      <Card.Body>
        <VStack gap={3} align="stretch">
          <HStack justify="space-between">
            <HStack gap={2}>
              <Icon boxSize={4} color="fg.muted">
                {typeIcon}
              </Icon>
              <Badge variant="subtle" colorPalette="gray" size="sm">
                {t(`types.${item.type}`)}
              </Badge>
            </HStack>
            {item.isFeatured && (
              <Badge variant="solid" colorPalette="yellow" size="sm">
                ⭐ Featured
              </Badge>
            )}
          </HStack>

          <VStack gap={1} align="start">
            <Heading size="md" lineClamp={2}>
              {item.url
                ? (
                  <ChakraLink href={item.url} target="_blank" rel="noopener noreferrer">
                    {title}
                    <Icon boxSize={3} ml={1} display="inline">
                      <ExternalLink />
                    </Icon>
                  </ChakraLink>
                )
                : title}
            </Heading>
            {item.author && (
              <Text fontSize="sm" color="fg.muted">
                {item.author}
                {item.year && ` (${item.year})`}
              </Text>
            )}
          </VStack>

          {notes && (
            <Text fontSize="sm" color="fg.muted" lineClamp={3}>
              {notes}
            </Text>
          )}

          {item.rating && <RatingStars rating={item.rating} />}

          {item.tags.length > 0 && (
            <HStack gap={1} flexWrap="wrap">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" size="sm">
                  {tag}
                </Badge>
              ))}
            </HStack>
          )}

          {item.completedAt && (
            <Text fontSize="xs" color="fg.muted">
              {t('completedOn')} {new Date(item.completedAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
})

/**
 * Компонент звёздочек рейтинга
 */
const RatingStars = memo(function RatingStars({ rating }: { rating: number }) {
  return (
    <HStack gap={0.5}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={`star-${i}`} boxSize={4} color={i < rating ? 'yellow.400' : 'gray.300'}>
          <Star fill={i < rating ? 'currentColor' : 'none'} />
        </Icon>
      ))}
    </HStack>
  )
})
