import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LuFileText, LuPlus } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { getContractTemplates } from '../_actions/contract-templates.action'
import { TemplatesList } from './_components/templates-list'

export const metadata = {
  title: 'Шаблоны договоров',
  description: 'Управление шаблонами договоров автошколы',
}

interface Props {
  params: Promise<{ schoolId: string }>
}

export default async function SchoolTemplatesPage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId } = await params

  // Получаем информацию о школе
  const school = await prisma.organization.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
    },
  })

  if (!school) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Школа не найдена
        </Heading>
      </Box>
    )
  }

  const result = await getContractTemplates(schoolId)

  if (!result.success) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Ошибка
        </Heading>
        <Text color="error.fg" mt={2}>
          {result.error === 'NOT_SCHOOL_ADMIN' ? 'Недостаточно прав доступа' : 'Не удалось загрузить шаблоны'}
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <VStack align="start" gap={1}>
          <HStack gap={3}>
            <LuFileText size={28} />
            <Heading size="xl">Шаблоны договоров</Heading>
          </HStack>
          <Text color="fg.muted">{school.name}</Text>
        </VStack>

        <Link href={`/school/contracts/templates/new?schoolId=${schoolId}`}>
          <Button colorPalette="blue">
            <LuPlus />
            Создать шаблон
          </Button>
        </Link>
      </HStack>

      <TemplatesList templates={result.templates} schoolId={schoolId} />
    </VStack>
  )
}
