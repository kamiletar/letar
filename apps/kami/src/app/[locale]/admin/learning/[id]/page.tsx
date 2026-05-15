import { prisma } from '@/lib/db'
import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LearningItemForm } from '../_components'

interface EditLearningPageProps {
  params: Promise<{ locale: string; id: string }>
}

/**
 * Страница редактирования LearningItem
 */
export default async function EditLearningPage({ params }: EditLearningPageProps) {
  const { locale, id } = await params

  const item = await prisma.learningItem.findUnique({
    where: { id },
  })

  if (!item) {
    notFound()
  }

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

      <Heading size="xl">Редактирование</Heading>

      <LearningItemForm item={item} locale={locale} />
    </VStack>
  )
}
