import { prisma } from '@/lib/db'
import { Box, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { TagsManager } from './_components/tags-manager'

interface TagsAdminPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Управление категориями и метками ссылок — массовое переименование/удаление сразу у
 * всех ссылок. Категория/метки хранятся как свободные строки прямо в `Link` (без отдельных
 * моделей, см. `schema/links.zmodel`) — эта страница считает списки и счётчики "на лету" из
 * текущих значений, а не редактирует отдельный справочник.
 */
export default async function TagsAdminPage({ params }: TagsAdminPageProps) {
  const { locale } = await params

  const links = await prisma.link.findMany({ select: { category: true, tags: true } })

  const categoryCounts = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  for (const link of links) {
    if (link.category) {
      categoryCounts.set(link.category, (categoryCounts.get(link.category) ?? 0) + 1)
    }
    for (const tag of link.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const categories = [...categoryCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  const tags = [...tagCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  return (
    <VStack gap={6} align="stretch">
      <HStack gap={3}>
        <Box asChild>
          <Link href={`/${locale}/admin/links`}>
            <Icon>
              <ArrowLeft />
            </Icon>
          </Link>
        </Box>
        <Heading size="xl">Категории и метки</Heading>
      </HStack>

      <Text color="fg.muted" fontSize="sm">
        Переименование/удаление применяется сразу ко всем ссылкам, где встречается значение — отдельного справочника
        нет, список считается по текущим ссылкам.
      </Text>

      <TagsManager categories={categories} tags={tags} />
    </VStack>
  )
}
