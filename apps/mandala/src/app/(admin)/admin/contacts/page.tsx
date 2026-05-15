import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Card, Heading, HStack, Link, Stack, Text, VStack } from '@chakra-ui/react'
import { EmptyState, Pagination, SearchFilter, StatusFilter } from '@letar/admin-ui'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LuMail } from 'react-icons/lu'
import { MarkAsReadButton } from './_components/mark-as-read-button'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Сообщения - Админ',
}

const PAGE_SIZE = 10

interface ContactsPageProps {
  searchParams: Promise<{
    q?: string
    read?: string
    page?: string
  }>
}

export default async function ContactMessagesPage({ searchParams }: ContactsPageProps) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    notFound()
  }

  const { q, read, page } = await searchParams
  const currentPage = Number(page) || 1

  // Строим условия фильтрации
  // ZenStack v3: не используем Prisma типы напрямую
  const where: Record<string, unknown> = {}

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { message: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (read !== undefined) {
    where.read = read === 'true'
  }

  const db = getEnhancedPrisma(session.user)

  // Параллельно запрашиваем данные и count
  const [messages, total, unreadCount] = await Promise.all([
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.contactMessage.count({ where }),
    db.contactMessage.count({ where: { read: false } }),
  ])

  const hasFilters = q || read !== undefined

  return (
    <Stack gap={6}>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>
          Сообщения{' '}
          {unreadCount > 0 && (
            <Badge colorPalette="red" fontSize={{ base: 'sm', md: 'md' }} ml={2}>
              {unreadCount} новых
            </Badge>
          )}
        </Heading>
      </HStack>

      {/* Панель поиска и фильтров */}
      <HStack gap={4} flexWrap="wrap">
        <Suspense fallback={<Box h="32px" />}>
          <SearchFilter placeholder="Поиск по имени, email, тексту..." />
        </Suspense>
        <Suspense fallback={<Box h="24px" />}>
          <StatusFilter
            paramName="read"
            options={[
              { value: 'false', label: 'Непрочитанные' },
              { value: 'true', label: 'Прочитанные' },
            ]}
          />
        </Suspense>
      </HStack>

      {messages.length === 0 ? (
        hasFilters ? (
          <Box py={8} textAlign="center">
            <Text color="fg.muted">Ничего не найдено по заданным фильтрам</Text>
          </Box>
        ) : (
          <EmptyState
            icon={LuMail}
            title="Нет сообщений"
            description="Сообщения появятся когда посетители заполнят форму обратной связи"
          />
        )
      ) : (
        <>
          <VStack gap={4} align="stretch">
            {messages.map((message) => (
              <Card.Root
                key={message.id}
                bg={
                  message.read
                    ? { _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }
                    : { _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' }
                }
                borderColor={message.read ? 'border.subtle' : 'purple.500'}
                borderWidth={message.read ? '1px' : '2px'}
              >
                <Card.Header>
                  <HStack justify="space-between" align="flex-start">
                    <Box>
                      <Text fontWeight="bold" color="fg">
                        {message.name}
                      </Text>
                      <Link href={`mailto:${message.email}`} color="fg" fontSize="sm" _hover={{ color: 'fg.brand' }}>
                        {message.email}
                      </Link>
                    </Box>
                    <HStack gap={2}>
                      <Text fontSize="sm" color="fg.muted">
                        {new Date(message.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {!message.read && <MarkAsReadButton messageId={message.id} />}
                    </HStack>
                  </HStack>
                </Card.Header>
                <Card.Body>
                  <Text color="fg.muted" whiteSpace="pre-wrap">
                    {message.message}
                  </Text>
                </Card.Body>
              </Card.Root>
            ))}
          </VStack>

          {/* Пагинация */}
          <Suspense fallback={<Box h="48px" />}>
            <Pagination total={total} pageSize={PAGE_SIZE} />
          </Suspense>
        </>
      )}
    </Stack>
  )
}
