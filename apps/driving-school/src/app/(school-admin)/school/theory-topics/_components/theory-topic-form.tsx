'use client'

import { Button, Fieldset, HStack, Input, SimpleGrid, Stack, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { LuPlus, LuTrash2 } from 'react-icons/lu'

import { toaster } from '@/app/_components/ui/toaster'
import { DrivingSchoolForm } from '@/driving-school-form'
import type { LicenseCategory } from '@letar/driving-school-db/prisma'

import type { TheoryTopicDetails } from '../_actions/theory-topic.action'
import {
  createTheoryTopicAction,
  getSchoolLicenseCategoriesAction,
  updateTheoryTopicAction,
} from '../_actions/theory-topic.action'
import { type TheoryTopicFormData, TheoryTopicFormSchema } from '../_schemas/theory-topic.schema'

// Тип данных формы со строковыми значениями для совместимости с Select
interface TheoryTopicFormValues {
  name: string
  description: string
  categories: string[]
  sortOrder: string
}

// Опции категорий прав

interface TheoryTopicFormProps {
  schoolId: string
  topic?: TheoryTopicDetails
}

export function TheoryTopicForm({ schoolId, topic }: TheoryTopicFormProps) {
  const router = useRouter()
  const isEditing = !!topic
  const [materials, setMaterials] = useState<string[]>(topic?.materials || [])
  const [newMaterial, setNewMaterial] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [schoolCategories, setSchoolCategories] = useState<string[]>([])

  // Загружаем категории прав школы для фильтрации Listbox
  useEffect(() => {
    getSchoolLicenseCategoriesAction(schoolId).then((result) => {
      if (result.success) {
        setSchoolCategories(result.categories)
      }
    })
  }, [schoolId])

  // Начальные значения формы
  const initialValues: TheoryTopicFormValues = useMemo(
    () =>
      topic
        ? {
            name: topic.name,
            description: topic.description || '',
            categories: topic.categories || [],
            sortOrder: topic.sortOrder.toString(),
          }
        : {
            name: '',
            description: '',
            categories: [],
            sortOrder: '0',
          },
    [topic]
  )

  const handleAddMaterial = () => {
    if (newMaterial.trim()) {
      try {
        // Проверяем валидность URL
        const _url = new URL(newMaterial.trim())
        void _url // Используем переменную для удовлетворения линтера
        setMaterials((prev) => [...prev, newMaterial.trim()])
        setNewMaterial('')
      } catch {
        toaster.error({ title: 'Некорректный URL' })
      }
    }
  }

  const handleRemoveMaterial = (urlToRemove: string) => {
    setMaterials((prev) => prev.filter((url) => url !== urlToRemove))
  }

  // Обработчик отправки формы
  const handleSubmit = async (value: TheoryTopicFormValues) => {
    setIsSubmitting(true)

    try {
      // Валидация обязательных полей
      if (!value.name || value.name.trim().length === 0) {
        toaster.error({ title: 'Введите название темы' })
        return
      }

      const data: TheoryTopicFormData = {
        schoolId,
        name: value.name.trim(),
        description: value.description?.trim() || undefined,
        categories: (value.categories as LicenseCategory[]) || [],
        sortOrder: parseInt(value.sortOrder) || 0,
        materials: materials.length > 0 ? materials : undefined,
      }

      // Валидация схемой
      const validation = TheoryTopicFormSchema.safeParse(data)
      if (!validation.success) {
        toaster.error({
          title: 'Ошибка валидации',
          description: validation.error.issues.map((issue) => issue.message).join(', '),
        })
        return
      }

      if (isEditing && topic) {
        const result = await updateTheoryTopicAction(topic.id, validation.data)

        if (result.success) {
          toaster.success({ title: 'Тема обновлена' })
          router.push(`/school/theory-topics/${schoolId}`)
          router.refresh()
        } else {
          toaster.error({ title: 'Ошибка обновления', description: result.error })
        }
      } else {
        const result = await createTheoryTopicAction(validation.data)

        if (result.success) {
          toaster.success({ title: 'Тема создана' })
          window.dispatchEvent(new Event('school-data-changed'))
          router.push(`/school/theory-topics/${schoolId}`)
          router.refresh()
        } else {
          toaster.error({ title: 'Ошибка создания', description: result.error })
        }
      }
    } catch (error) {
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Произошла неизвестная ошибка',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <DrivingSchoolForm<TheoryTopicFormValues> initialValue={initialValues} onSubmit={handleSubmit}>
      <DrivingSchoolForm.DirtyGuard />
      <Stack gap={6}>
        <DrivingSchoolForm.Errors title="Ошибки формы" />

        {/* Main info */}
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold">Основная информация</Fieldset.Legend>
          <Fieldset.Content>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <DrivingSchoolForm.Field.String
                name="name"
                label="Название темы"
                placeholder="ПДД: проезд перекрёстков"
                required
              />

              <DrivingSchoolForm.Listbox.LicenseCategories
                name="categories"
                label="Категории прав"
                helperText="Выберите категории, к которым относится эта тема (пусто = ко всем)"
                allowedCategories={schoolCategories}
              />
            </SimpleGrid>

            <DrivingSchoolForm.Field.Textarea
              name="description"
              label="Описание"
              placeholder="Подробное описание темы..."
              rows={4}
            />

            <DrivingSchoolForm.Field.Number
              name="sortOrder"
              label="Порядок в программе"
              min={0}
              helperText="Меньшее число — раньше в списке"
            />
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Learning materials */}
        <Fieldset.Root>
          <Fieldset.Legend fontWeight="semibold">Учебные материалы</Fieldset.Legend>
          <Fieldset.Content>
            <VStack gap={3} align="stretch">
              <HStack>
                <Input
                  placeholder="https://example.com/material.pdf"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddMaterial()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddMaterial}>
                  <LuPlus />
                  Добавить
                </Button>
              </HStack>

              {materials.length > 0 && (
                <VStack align="stretch" gap={2}>
                  {materials.map((url) => (
                    <HStack key={url} p={2} bg="bg.subtle" borderRadius="md" justify="space-between">
                      <Text fontSize="sm" flex={1} lineClamp={1}>
                        {url}
                      </Text>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        colorPalette="red"
                        onClick={() => handleRemoveMaterial(url)}
                      >
                        <LuTrash2 />
                      </Button>
                    </HStack>
                  ))}
                </VStack>
              )}

              <Text fontSize="sm" color="fg.muted">
                Добавьте ссылки на учебные материалы: презентации, видео, документы
              </Text>
            </VStack>
          </Fieldset.Content>
        </Fieldset.Root>

        {/* Buttons */}
        <HStack justify="flex-end" gap={4}>
          <Button type="button" variant="ghost" onClick={() => router.push(`/school/theory-topics/${schoolId}`)}>
            Отмена
          </Button>
          <Button type="submit" colorPalette="brand" loading={isSubmitting}>
            {isEditing ? 'Сохранить' : 'Создать тему'}
          </Button>
        </HStack>
      </Stack>
    </DrivingSchoolForm>
  )
}
