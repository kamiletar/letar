import { prisma } from '@/lib/db'
import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SkillCategoryForm } from '../../_components'

interface EditCategoryPageProps {
  params: Promise<{ locale: string; id: string }>
}

/**
 * Страница редактирования категории навыков
 */
export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { locale, id } = await params

  const category = await prisma.skillCategory.findUnique({
    where: { id },
  })

  if (!category) {
    notFound()
  }

  return (
    <VStack gap={6} align="stretch">
      <HStack>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/admin/skills/categories`}>
            <Icon>
              <ArrowLeft />
            </Icon>
            Назад
          </Link>
        </Button>
      </HStack>

      <Heading size="xl">Редактирование категории</Heading>

      <SkillCategoryForm category={category} locale={locale} />
    </VStack>
  )
}
