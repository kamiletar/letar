import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ProjectForm } from '../_components'

interface NewProjectPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Страница создания нового проекта
 */
export default async function NewProjectPage({ params }: NewProjectPageProps) {
  const { locale } = await params

  return (
    <VStack gap={6} align="stretch">
      <HStack>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/admin/projects`}>
            <Icon>
              <ArrowLeft />
            </Icon>
            Назад
          </Link>
        </Button>
      </HStack>

      <Heading size="xl">Добавить проект</Heading>

      <ProjectForm locale={locale} />
    </VStack>
  )
}
