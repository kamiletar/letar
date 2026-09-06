import { Link } from '@/i18n/navigation'
import { GLOW } from '@/lib/utils/constants'
import { Badge, Box, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { ArrowRight, Calendar } from 'lucide-react'

export interface PostCardEntry {
  title: string
  titleEn: string | null
  description: string
  descriptionEn: string | null
  publishedAt: string | null
  tags: readonly string[]
  featured: boolean
}

interface PostCardProps {
  slug: string
  entry: PostCardEntry
  href: string
  l: (ru: string, en?: string | null) => string
  /** Показать бейдж «Диалог с ИИ» вместо Featured (раздел /blog/dialogues) */
  dialogueBadgeLabel?: string
}

/**
 * Карточка поста в списке блога — одна колонка на всю ширину контейнера
 * (F-паттерн чтения: заголовок сверху слева, описание и метаданные ниже).
 */
export function PostCard({ slug, entry, href, l, dialogueBadgeLabel }: PostCardProps) {
  return (
    <Link key={slug} href={href}>
      <Box
        p={{ base: 5, md: 6 }}
        borderRadius="xl"
        bg="bg.panel"
        border="1px solid"
        borderColor="border.subtle"
        _hover={{
          borderColor: 'fg.500',
          boxShadow: GLOW.cardShadowFull,
          '& .card-arrow': { transform: 'translateX(4px)', opacity: 1 },
        }}
        transitionProperty="border-color, box-shadow"
        transitionDuration="0.3s"
        transitionTimingFunction="cubic-bezier(0.4, 0, 0.2, 1)"
        position="relative"
        overflow="hidden"
      >
        <Icon
          className="card-arrow"
          position="absolute"
          right={{ base: 4, md: 6 }}
          top="50%"
          transform="translateY(-50%)"
          opacity={0}
          transitionProperty="transform, opacity"
          transitionDuration="0.3s"
          color="fg.500"
          boxSize={5}
          display={{ base: 'none', md: 'block' }}
        >
          <ArrowRight />
        </Icon>

        <VStack align="start" gap={3} pr={{ base: 0, md: 10 }}>
          <HStack gap={2} flexWrap="wrap">
            {dialogueBadgeLabel && (
              <Badge colorPalette="purple" variant="subtle">
                {dialogueBadgeLabel}
              </Badge>
            )}
            {entry.featured && (
              <Badge colorPalette="fg" variant="solid">
                Featured
              </Badge>
            )}
          </HStack>

          <Heading as="h2" fontSize={{ base: 'lg', md: 'xl' }}>
            {l(entry.title, entry.titleEn)}
          </Heading>

          <Text fontSize="sm" color="fg.subtle" lineClamp={2}>
            {l(entry.description, entry.descriptionEn)}
          </Text>

          <HStack gap={4} flexWrap="wrap" fontSize="sm" color="fg.subtle">
            <HStack gap={2}>
              <Calendar size={14} />
              <Text>
                {new Date(entry.publishedAt || '').toLocaleDateString(l('ru-RU', 'en-US'), {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </HStack>

            {entry.tags.length > 0 && (
              <HStack gap={2} flexWrap="wrap">
                {entry.tags.map((tag) => (
                  <Badge key={tag} variant="subtle" colorPalette="gray" size="sm">
                    {tag}
                  </Badge>
                ))}
              </HStack>
            )}
          </HStack>
        </VStack>
      </Box>
    </Link>
  )
}
