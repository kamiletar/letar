'use client'

import {
  Badge,
  Box,
  Button,
  Card,
  EmptyState,
  Heading,
  HStack,
  IconButton,
  Menu,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuCopy, LuEllipsisVertical, LuEye, LuFileText, LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'

import { TEMPLATE_TYPE_COLORS, TEMPLATE_TYPE_LABELS } from '../../../contract-constants'
import type { ContractTemplateListItem } from '../../_actions/contract-templates.action'
import { deleteContractTemplate } from '../../_actions/contract-templates.action'

interface TemplatesListProps {
  templates: ContractTemplateListItem[]
  schoolId: string
}

export function TemplatesList({ templates, schoolId }: TemplatesListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (templateId: string, templateName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить шаблон "${templateName}"?`)) {
      return
    }

    setDeletingId(templateId)

    try {
      const result = await deleteContractTemplate(templateId)

      if (!result.success) {
        toaster.error({ title: result.error })
        return
      }

      toaster.success({ title: 'Шаблон удалён' })
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (templates.length === 0) {
    return (
      <Card.Root>
        <Card.Body>
          <EmptyState.Root>
            <EmptyState.Content>
              <EmptyState.Indicator>
                <LuFileText />
              </EmptyState.Indicator>
              <VStack textAlign="center">
                <EmptyState.Title>Шаблоны договоров не созданы</EmptyState.Title>
                <EmptyState.Description>
                  Создайте первый шаблон договора для автоматического заполнения данными учеников
                </EmptyState.Description>
              </VStack>
            </EmptyState.Content>
            <Link href={`/school/contracts/templates/new?schoolId=${schoolId}`}>
              <Button colorPalette="blue">
                <LuPlus />
                Создать шаблон
              </Button>
            </Link>
          </EmptyState.Root>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
      {templates.map((template) => (
        <Card.Root
          key={template.id}
          opacity={!template.isActive ? 0.6 : 1}
          borderStyle={!template.isActive ? 'dashed' : 'solid'}
        >
          <Card.Body>
            <VStack align="stretch" gap={3}>
              <HStack justify="space-between">
                <Badge colorPalette={TEMPLATE_TYPE_COLORS[template.type] || 'gray'} size="sm">
                  {TEMPLATE_TYPE_LABELS[template.type] || template.type}
                </Badge>
                <Menu.Root>
                  <Menu.Trigger asChild>
                    <IconButton variant="ghost" size="sm" aria-label="Действия">
                      <LuEllipsisVertical />
                    </IconButton>
                  </Menu.Trigger>
                  <Menu.Positioner>
                    <Menu.Content>
                      <Menu.Item
                        value="edit"
                        onClick={() => router.push(`/school/contracts/templates/${schoolId}/${template.id}/edit`)}
                      >
                        <LuPencil /> Редактировать
                      </Menu.Item>
                      <Menu.Item
                        value="preview"
                        onClick={() => router.push(`/school/contracts/templates/${schoolId}/${template.id}/preview`)}
                      >
                        <LuEye /> Предпросмотр
                      </Menu.Item>
                      <Menu.Item
                        value="duplicate"
                        onClick={() =>
                          router.push(`/school/contracts/templates/new?schoolId=${schoolId}&copyFrom=${template.id}`)
                        }
                      >
                        <LuCopy /> Дублировать
                      </Menu.Item>
                      <Menu.Separator />
                      <Menu.Item
                        value="delete"
                        color="fg.error"
                        disabled={deletingId === template.id}
                        onClick={() => handleDelete(template.id, template.name)}
                      >
                        <LuTrash2 /> Удалить
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Menu.Root>
              </HStack>

              <Box>
                <Heading size="md" lineClamp={2}>
                  {template.name}
                </Heading>
                {template.description && (
                  <Text color="fg.muted" fontSize="sm" lineClamp={2} mt={1}>
                    {template.description}
                  </Text>
                )}
              </Box>

              <HStack justify="space-between" fontSize="sm" color="fg.muted">
                <Text>Версия: {template.currentVersion?.version || '—'}</Text>
                {!template.isActive && (
                  <Badge colorPalette="red" size="sm">
                    Неактивен
                  </Badge>
                )}
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      ))}
    </SimpleGrid>
  )
}
