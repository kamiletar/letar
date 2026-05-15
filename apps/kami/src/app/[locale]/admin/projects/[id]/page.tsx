import { prisma } from '@/lib/db'
import { Button, Heading, HStack, Icon, VStack } from '@chakra-ui/react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProjectForm } from '../_components'

interface EditProjectPageProps {
  params: Promise<{ locale: string; id: string }>
}

/**
 * Страница редактирования проекта
 */
export default async function EditProjectPage({ params }: EditProjectPageProps) {
  const { locale, id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
  })

  if (!project) {
    notFound()
  }

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

      <Heading size="xl">Редактирование проекта</Heading>

      <ProjectForm project={project} locale={locale} />
    </VStack>
  )
}
