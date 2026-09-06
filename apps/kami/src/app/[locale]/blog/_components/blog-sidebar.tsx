import { Link } from '@/i18n/navigation'
import { Badge, Box, Heading, HStack, Icon, Text, VStack, Wrap } from '@chakra-ui/react'
import { MessageSquare } from 'lucide-react'

interface BlogSidebarProps {
  tags: string[]
  currentTag?: string
  basePath: string
  allLabel: string
  tagsLabel: string
  dialogues?: {
    href: string
    title: string
    description: string
    count: number
  }
}

/** Строит href базового пути с текущим/новым тегом (без тега — снять фильтр) */
function buildHref(basePath: string, tag?: string): string {
  if (!tag) {
    return basePath
  }
  return `${basePath}?tag=${encodeURIComponent(tag)}`
}

/**
 * Правый сайдбар блога — виджеты «Диалоги с ИИ» и фильтр по тегам,
 * по образцу Хабра (контент слева на всю ширину, узкие виджеты справа).
 */
export function BlogSidebar({ tags, currentTag, basePath, allLabel, tagsLabel, dialogues }: BlogSidebarProps) {
  return (
    <VStack gap={5} align="stretch" position={{ base: 'static', lg: 'sticky' }} top={{ lg: '24' }}>
      {dialogues && dialogues.count > 0 && (
        <Link href={dialogues.href}>
          <Box
            p={4}
            borderRadius="lg"
            bg="bg.subtle"
            border="1px solid"
            borderColor="border.subtle"
            _hover={{ borderColor: 'purple.400' }}
            transitionProperty="border-color"
            transitionDuration="0.2s"
          >
            <HStack gap={3} align="start">
              <Icon color="purple.400" boxSize={5} flexShrink={0} mt="1px">
                <MessageSquare />
              </Icon>
              <VStack align="start" gap={1}>
                <HStack justify="space-between" width="full">
                  <Text fontWeight="medium">{dialogues.title}</Text>
                  <Text fontSize="sm" color="fg.subtle" flexShrink={0}>
                    {dialogues.count}
                  </Text>
                </HStack>
                <Text fontSize="sm" color="fg.subtle">
                  {dialogues.description}
                </Text>
              </VStack>
            </HStack>
          </Box>
        </Link>
      )}

      {tags.length > 0 && (
        <Box p={4} borderRadius="lg" bg="bg.subtle" border="1px solid" borderColor="border.subtle">
          <Heading
            as="h2"
            fontSize="sm"
            color="fg.subtle"
            fontWeight="semibold"
            mb={3}
            textTransform="uppercase"
            letterSpacing="wide"
          >
            {tagsLabel}
          </Heading>
          <Wrap gap={2}>
            <Badge asChild variant={!currentTag ? 'solid' : 'outline'} colorPalette="teal" cursor="pointer">
              <Link href={buildHref(basePath)}>{allLabel}</Link>
            </Badge>
            {tags.map((tag) => (
              <Badge
                key={tag}
                asChild
                variant={currentTag === tag ? 'solid' : 'outline'}
                colorPalette="teal"
                cursor="pointer"
              >
                <Link href={buildHref(basePath, tag)}>#{tag}</Link>
              </Badge>
            ))}
          </Wrap>
        </Box>
      )}
    </VStack>
  )
}
