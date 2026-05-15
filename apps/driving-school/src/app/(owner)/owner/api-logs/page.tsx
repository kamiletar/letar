import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Container } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ApiLogsInfinite } from './_components/api-logs-infinite'

export const metadata: Metadata = {
  title: 'Логи API — Панель владельца',
  description: 'Просмотр логов всех API запросов платформы',
}

export default async function ApiLogsPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  // Проверяем роль OWNER
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  })

  if (!user?.roles.includes('OWNER')) {
    redirect('/')
  }

  // Получаем список организаций для фильтра
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  })

  return (
    <Container maxW="container.xl" py={8}>
      <ApiLogsInfinite organizations={organizations} />
    </Container>
  )
}
