import { prisma } from '@/lib/db'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Box, HStack, Icon, Text } from '@chakra-ui/react'
import { Tags } from 'lucide-react'
import Link from 'next/link'
import { AdminPageLayout } from '../_components'
import { LinksTable } from './_components/links-table'

interface LinksAdminPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ page?: string }>
}

/**
 * Сохранённые ссылки (Web Share Target из Android) — приватный раздел, только владелец.
 */
export default async function LinksAdminPage({ params, searchParams }: LinksAdminPageProps) {
  const { locale } = await params
  const { page: pageParam } = await searchParams
  const page = Number(pageParam) || 1

  const [links, total] = await Promise.all([
    prisma.link.findMany({
      orderBy: [{ read: 'asc' }, { createdAt: 'desc' }],
      take: ADMIN_PAGE_SIZE,
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      select: {
        id: true,
        url: true,
        title: true,
        category: true,
        tags: true,
        read: true,
        createdAt: true,
      },
    }),
    prisma.link.count(),
  ])

  return (
    <AdminPageLayout
      title="Ссылки"
      total={total}
      basePath={`/${locale}/admin/links`}
      emptyText="Ссылок пока нет — поделитесь страницей с телефона через Android Share"
      isEmpty={links.length === 0}
      headerExtra={
        <HStack justify="flex-end">
          <Box asChild>
            <Link href={`/${locale}/admin/links/tags`}>
              <HStack gap={1} color="fg.muted" fontSize="sm">
                <Icon boxSize="14px">
                  <Tags />
                </Icon>
                <Text>Категории и метки</Text>
              </HStack>
            </Link>
          </Box>
        </HStack>
      }
    >
      <LinksTable links={links} />
    </AdminPageLayout>
  )
}
