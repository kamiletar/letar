import { prisma } from '@/lib/db'
import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SkillForm } from '../_components'

interface NewSkillPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Страница создания нового навыка
 */
export default async function NewSkillPage({ params }: NewSkillPageProps) {
  const { locale } = await params

  // Получаем категории для select
  const categories = await prisma.skillCategory.findMany({
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
    },
  })

  return (
    <VStack gap={6} align="stretch">
      <HStack>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/admin/skills`}>
            <Icon>
              <ArrowLeft />
            </Icon>
            Назад
          </Link>
        </Button>
      </HStack>

      <Heading size="xl">Добавить навык</Heading>

      <SkillForm categories={categories} locale={locale} />
    </VStack>
  )
}
