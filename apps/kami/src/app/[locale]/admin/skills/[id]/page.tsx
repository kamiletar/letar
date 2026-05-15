import { prisma } from '@/lib/db'
import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SkillForm } from '../_components'

interface EditSkillPageProps {
  params: Promise<{ locale: string; id: string }>
}

/**
 * Страница редактирования навыка
 */
export default async function EditSkillPage({ params }: EditSkillPageProps) {
  const { locale, id } = await params

  // Параллельные запросы: навык + категории
  const [skill, categories] = await Promise.all([
    prisma.skill.findUnique({
      where: { id },
    }),
    prisma.skillCategory.findMany({
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
      },
    }),
  ])

  if (!skill) {
    notFound()
  }

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

      <Heading size="xl">Редактирование навыка</Heading>

      <SkillForm skill={skill} categories={categories} locale={locale} />
    </VStack>
  )
}
