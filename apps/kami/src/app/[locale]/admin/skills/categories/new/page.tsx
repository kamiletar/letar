import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SkillCategoryForm } from '../../_components'

interface NewCategoryPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Страница создания новой категории навыков
 */
export default async function NewCategoryPage({ params }: NewCategoryPageProps) {
  const { locale } = await params

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

      <Heading size="xl">Добавить категорию</Heading>

      <SkillCategoryForm locale={locale} />
    </VStack>
  )
}
