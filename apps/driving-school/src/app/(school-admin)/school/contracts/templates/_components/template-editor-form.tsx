'use client'

import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Tabs,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { LuEye, LuFileText, LuSave, LuTags } from 'react-icons/lu'

import { SafeHtml } from '@/app/_components/ui/safe-html'
import { toaster } from '@/app/_components/ui/toaster'
import {
  createDefaultTrainingContractTemplate,
  createTestData,
  extractPlaceholders,
  renderTemplate,
} from '@letar/contract-generator'

import { createContractTemplate, createTemplateVersion } from '../_actions/contract-templates.action'
import { PlaceholderPanel } from './placeholder-panel'

const TEMPLATE_TYPES = [
  { value: 'TRAINING_CONTRACT', label: 'Договор на обучение' },
  { value: 'THEORY_CONTRACT', label: 'Договор на теорию' },
  { value: 'PRACTICE_CONTRACT', label: 'Договор на практику' },
  { value: 'CUSTOM', label: 'Произвольный договор' },
]

interface TemplateEditorFormProps {
  schoolId: string
  templateId?: string
  initialData?: {
    name: string
    type: string
    description: string | null
    content: string
  }
  mode: 'create' | 'edit' | 'new-version'
}

export function TemplateEditorForm({ schoolId, templateId, initialData, mode }: TemplateEditorFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Состояние формы
  const [name, setName] = useState(initialData?.name || '')
  const [type, setType] = useState(initialData?.type || 'TRAINING_CONTRACT')
  const [description, setDescription] = useState(initialData?.description || '')
  const [content, setContent] = useState(initialData?.content || createDefaultTrainingContractTemplate())
  const [changelog, setChangelog] = useState('')

  // Для предпросмотра
  const [activeTab, setActiveTab] = useState<string>('editor')
  const [previewHtml, setPreviewHtml] = useState('')

  // Ref для textarea чтобы вставлять плейсхолдеры в позицию курсора
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Обработка вставки плейсхолдера
  const handleInsertPlaceholder = (placeholder: string) => {
    if (!textareaRef.current) {
      return
    }

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd

    const newContent = content.substring(0, start) + placeholder + content.substring(end)
    setContent(newContent)

    // Восстанавливаем фокус и позицию курсора
    requestAnimationFrame(() => {
      textarea.focus()
      const newPosition = start + placeholder.length
      textarea.setSelectionRange(newPosition, newPosition)
    })
  }

  // Генерация превью
  // Примечание: HTML создаётся из шаблона администратора и тестовых данных.
  // Это безопасно, т.к. контент контролируется самим админом.
  const handlePreview = () => {
    const testData = createTestData()
    const result = renderTemplate(content, testData)
    setPreviewHtml(result.html)
    setActiveTab('preview')
  }

  // Извлечение списка плейсхолдеров из контента
  const usedPlaceholders = extractPlaceholders(content)

  // Отправка формы
  const handleSubmit = () => {
    if (!name.trim()) {
      toaster.error({ title: 'Введите название шаблона' })
      return
    }

    if (!content.trim()) {
      toaster.error({ title: 'Введите содержимое шаблона' })
      return
    }

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const result = await createContractTemplate({
            organizationId: schoolId,
            name: name.trim(),
            type,
            description: description.trim() || undefined,
            content: content.trim(),
          })

          if (!result.success) {
            toaster.error({ title: result.error })
            return
          }

          toaster.success({ title: 'Шаблон создан' })
          router.push(`/school/contracts/templates/${schoolId}`)
        } else if (mode === 'new-version' && templateId) {
          const result = await createTemplateVersion({
            templateId,
            content: content.trim(),
            changelog: changelog.trim() || undefined,
          })

          if (!result.success) {
            toaster.error({ title: result.error })
            return
          }

          toaster.success({ title: 'Новая версия создана' })
          router.push(`/school/contracts/templates/${schoolId}/${templateId}/edit`)
          router.refresh()
        }
      } catch (error) {
        console.error('Ошибка сохранения:', error)
        toaster.error({ title: 'Не удалось сохранить' })
      }
    })
  }

  return (
    <Grid templateColumns={{ base: '1fr', lg: '1fr 320px' }} gap={6} alignItems="start">
      {/* Основная часть — редактор */}
      <VStack align="stretch" gap={4}>
        <Card.Root>
          <Card.Body>
            <VStack align="stretch" gap={4}>
              {/* Название и тип */}
              <HStack gap={4} flexWrap={{ base: 'wrap', md: 'nowrap' }}>
                <Field.Root flex={2}>
                  <Field.Label>Название шаблона</Field.Label>
                  <Input
                    placeholder="Договор на обучение категории B"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    disabled={mode === 'new-version'}
                  />
                </Field.Root>

                <Field.Root flex={1} minW="200px">
                  <Field.Label>Тип договора</Field.Label>
                  <NativeSelect.Root disabled={mode === 'new-version'}>
                    <NativeSelect.Field
                      value={type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value)}
                    >
                      {TEMPLATE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </Field.Root>
              </HStack>

              {/* Описание */}
              <Field.Root>
                <Field.Label>Описание (опционально)</Field.Label>
                <Input
                  placeholder="Краткое описание для чего этот шаблон"
                  value={description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
                  disabled={mode === 'new-version'}
                />
              </Field.Root>

              {/* Changelog для новой версии */}
              {mode === 'new-version' && (
                <Field.Root>
                  <Field.Label>Что изменилось в этой версии</Field.Label>
                  <Input
                    placeholder="Например: Добавлен пункт 5.3 про возврат средств"
                    value={changelog}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChangelog(e.target.value)}
                  />
                </Field.Root>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Редактор / Превью */}
        <Card.Root>
          <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value)}>
            <Card.Header pb={0}>
              <Tabs.List>
                <Tabs.Trigger value="editor">
                  <LuFileText />
                  HTML-редактор
                </Tabs.Trigger>
                <Tabs.Trigger value="preview" onClick={handlePreview}>
                  <LuEye />
                  Предпросмотр
                </Tabs.Trigger>
              </Tabs.List>
            </Card.Header>

            <Card.Body>
              <Tabs.Content value="editor" pt={0}>
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  minH="500px"
                  fontFamily="mono"
                  fontSize="sm"
                  placeholder="Введите HTML с плейсхолдерами {{student.fullName}}"
                />
              </Tabs.Content>

              <Tabs.Content value="preview" pt={0}>
                <Box
                  borderWidth={1}
                  borderRadius="md"
                  p={4}
                  minH="500px"
                  bg="white"
                  _dark={{ bg: 'gray.900' }}
                  css={{
                    '& h1': { fontSize: '1.5em', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center' },
                    '& h2': { fontSize: '1.25em', fontWeight: 'bold', marginTop: '1rem', marginBottom: '0.5rem' },
                    '& p': { marginBottom: '0.5rem', textIndent: '1.25cm', textAlign: 'justify' },
                    '& table': { width: '100%', borderCollapse: 'collapse', margin: '1rem 0' },
                    '& td, & th': { border: '1px solid var(--chakra-colors-gray-300)', padding: '0.5rem' },
                  }}
                >
                  <SafeHtml html={previewHtml} />
                </Box>
              </Tabs.Content>
            </Card.Body>
          </Tabs.Root>
        </Card.Root>

        {/* Кнопки */}
        <Flex justify="space-between" gap={4}>
          <Button variant="ghost" onClick={() => router.back()}>
            Отмена
          </Button>
          <Button colorPalette="blue" onClick={handleSubmit} loading={isPending}>
            <LuSave />
            {mode === 'new-version' ? 'Сохранить версию' : 'Создать шаблон'}
          </Button>
        </Flex>
      </VStack>

      {/* Боковая панель — плейсхолдеры */}
      <Box position="sticky" top={4}>
        <Card.Root>
          <Card.Header>
            <HStack>
              <LuTags />
              <Heading size="sm">Плейсхолдеры</Heading>
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              Нажмите для копирования
            </Text>
          </Card.Header>
          <Card.Body pt={0} maxH="calc(100vh - 200px)" overflowY="auto">
            <PlaceholderPanel onInsert={handleInsertPlaceholder} />
          </Card.Body>
          <Card.Footer>
            <Text fontSize="xs" color="fg.muted">
              Использовано: {usedPlaceholders.length} плейсхолдеров
            </Text>
          </Card.Footer>
        </Card.Root>
      </Box>
    </Grid>
  )
}
