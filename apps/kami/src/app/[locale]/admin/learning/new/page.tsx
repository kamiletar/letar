import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { LearningItemForm } from '../_components'

interface NewLearningPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Страница создания нового LearningItem
 */
export default async function NewLearningPage({ params }: NewLearningPageProps) {
  const { locale } = await params

  return (
    <VStack gap={6} align="stretch">
      <HStack>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/admin/learning`}>
            <Icon>
              <ArrowLeft />
            </Icon>
            Назад
          </Link>
        </Button>
      </HStack>

      <Heading size="xl">Добавить элемент</Heading>

      <LearningItemForm locale={locale} />
    </VStack>
  )
}
