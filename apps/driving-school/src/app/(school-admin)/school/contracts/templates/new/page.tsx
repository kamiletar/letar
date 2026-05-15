import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuFilePlus } from 'react-icons/lu'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

import { getContractTemplateDetail } from '../_actions/contract-templates.action'
import { TemplateEditorForm } from '../_components/template-editor-form'

export const metadata = {
  title: 'Новый шаблон договора',
  description: 'Создание нового шаблона договора',
}

interface Props {
  searchParams: Promise<{ schoolId?: string; copyFrom?: string }>
}

export default async function NewTemplatePage({ searchParams }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId, copyFrom } = await searchParams

  if (!schoolId) {
    redirect('/school/contracts/templates')
  }

  // Проверяем что школа существует и пользователь имеет доступ
  const membership = await prisma.member.findFirst({
    where: {
      organizationId: schoolId,
      userId: session.user.id,
      role: { in: ['owner', 'super_manager', 'manager'] },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!membership) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Доступ запрещён
        </Heading>
        <Text color="error.fg" mt={2}>
          У вас нет прав для создания шаблонов в этой школе
        </Text>
      </Box>
    )
  }

  // Если передан copyFrom — загружаем шаблон для копирования
  let initialData:
    | {
        name: string
        type: string
        description: string | null
        content: string
      }
    | undefined

  if (copyFrom) {
    const result = await getContractTemplateDetail(copyFrom)
    if (result.success && result.template.currentVersion) {
      initialData = {
        name: `${result.template.name} (копия)`,
        type: result.template.type,
        description: result.template.description,
        content: result.template.currentVersion.content,
      }
    }
  }

  return (
    <VStack gap={6} align="stretch">
      <VStack align="start" gap={1}>
        <HStack gap={3}>
          <LuFilePlus size={28} />
          <Heading size="xl">Новый шаблон договора</Heading>
        </HStack>
        <Text color="fg.muted">{membership.organization.name}</Text>
      </VStack>

      <TemplateEditorForm schoolId={schoolId} mode="create" initialData={initialData} />
    </VStack>
  )
}
