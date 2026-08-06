'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { SkillCategoryCreateFormSchema } from '@/generated/form-schemas/SkillCategory.form'
import type { SkillCategory } from '@/generated/prisma'
import { KamiForm } from '@/kami-form'
import { Button, Card, HStack, SimpleGrid, Stack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import {
  createSkillCategoryAction,
  deleteSkillCategoryAction,
  updateSkillCategoryAction,
} from '../_actions/skills.action'

interface SkillCategoryFormProps {
  /** Данные для редактирования (если не переданы — создание) */
  category?: SkillCategory | null
  /** Локаль для редиректа */
  locale: string
}

/**
 * Форма создания/редактирования SkillCategory
 */
export function SkillCategoryForm({ category, locale }: SkillCategoryFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const isEditing = Boolean(category)

  const handleSubmit = useCallback(
    async (data: unknown) => {
      startTransition(async () => {
        const result = isEditing
          ? await updateSkillCategoryAction(category!.id, data)
          : await createSkillCategoryAction(data)

        if (!result.success) {
          toaster.error({
            title: 'Ошибка',
            description: result.error === 'VALIDATION_ERROR' ? 'Проверьте правильность заполнения формы' : result.error,
          })
          return
        }

        toaster.success({
          title: isEditing ? 'Обновлено' : 'Создано',
          description: 'Данные успешно сохранены',
        })

        router.push(`/${locale}/admin/skills/categories`)
      })
    },
    [isEditing, category, locale, router],
  )

  const handleDelete = useCallback(async () => {
    if (!category || !(await confirm({ title: 'Удалить эту категорию?' }))) {
      return
    }

    startTransition(async () => {
      const result = await deleteSkillCategoryAction(category.id)

      if (!result.success) {
        toaster.error({
          title: 'Ошибка',
          description: result.error,
        })
        return
      }

      toaster.success({ title: 'Удалено' })
      router.push(`/${locale}/admin/skills/categories`)
    })
  }, [category, locale, router])

  // Начальные значения для формы
  const initialValues = category
    ? {
      name: category.name,
      nameEn: category.nameEn,
      slug: category.slug,
      icon: category.icon ?? '',
      order: category.order,
    }
    : {
      name: '',
      nameEn: '',
      slug: '',
      icon: '',
      order: 0,
    }

  return (
    <>
      <ConfirmDialog />
      <KamiForm initialValue={initialValues} schema={SkillCategoryCreateFormSchema} onSubmit={handleSubmit}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{isEditing ? 'Редактирование категории' : 'Новая категория'}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              {/* Названия */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.String name="name" label="Название (RU)" placeholder="Фронтенд, Бэкенд..." required />
                <KamiForm.Field.String
                  name="nameEn"
                  label="Название (EN)"
                  placeholder="Frontend, Backend..."
                  required
                />
              </SimpleGrid>

              {/* Slug и иконка */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.String name="slug" label="Slug" placeholder="frontend, backend..." required />
                <KamiForm.Field.String name="icon" label="Иконка (lucide)" placeholder="Code, Server, Database..." />
              </SimpleGrid>

              {/* Порядок */}
              <KamiForm.Field.Number name="order" label="Порядок" min={0} />
            </Stack>
          </Card.Body>
          <Card.Footer>
            <HStack justify="space-between" w="full">
              <HStack>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/admin/skills/categories`}>Отмена</Link>
                </Button>
                {isEditing && (
                  <Button variant="ghost" colorPalette="red" onClick={handleDelete} disabled={isPending}>
                    Удалить
                  </Button>
                )}
              </HStack>
              <KamiForm.Button.Submit colorPalette="fg" disabled={isPending}>
                {isEditing ? 'Сохранить' : 'Создать'}
              </KamiForm.Button.Submit>
            </HStack>
          </Card.Footer>
        </Card.Root>
      </KamiForm>
    </>
  )
}
