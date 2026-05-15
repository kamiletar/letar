import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { LuFilePen } from 'react-icons/lu'

import { getSession } from '@/lib/auth'

import { getContractTemplateDetail } from '../../../_actions/contract-templates.action'
import { TemplateEditorForm } from '../../../_components/template-editor-form'

export const metadata = {
  title: 'Редактирование шаблона',
  description: 'Редактирование шаблона договора',
}

interface Props {
  params: Promise<{ schoolId: string; templateId: string }>
}

export default async function EditTemplatePage({ params }: Props) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const { schoolId, templateId } = await params
  void schoolId // Используется для маршрутизации

  const result = await getContractTemplateDetail(templateId)

  if (!result.success) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          {result.error === 'NOT_FOUND' ? 'Шаблон не найден' : 'Ошибка'}
        </Heading>
        <Text color="error.fg" mt={2}>
          {result.error === 'NOT_SCHOOL_ADMIN' ? 'Недостаточно прав доступа' : 'Не удалось загрузить шаблон'}
        </Text>
      </Box>
    )
  }

  const { template } = result

  if (!template.currentVersion) {
    return (
      <Box layerStyle="panel.error" p={6} textAlign="center">
        <Heading size="lg" color="error.fg">
          Нет версии шаблона
        </Heading>
        <Text color="error.fg" mt={2}>
          У шаблона нет текущей версии
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={6} align="stretch">
      <VStack align="start" gap={1}>
        <HStack gap={3}>
          <LuFilePen size={28} />
          <Heading size="xl">Редактирование шаблона</Heading>
        </HStack>
        <Text color="fg.muted">
          {template.name} · Версия {template.currentVersion.version}
        </Text>
      </VStack>

      <TemplateEditorForm
        schoolId={template.organizationId}
        templateId={template.id}
        mode="new-version"
        initialData={{
          name: template.name,
          type: template.type,
          description: template.description,
          content: template.currentVersion.content,
        }}
      />
    </VStack>
  )
}
