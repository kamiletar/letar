'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { LearningItemCreateFormSchema } from '@/generated/form-schemas/LearningItem.form'
import type { LearningItem } from '@/generated/prisma'
import { KamiForm } from '@/kami-form'
import { Button, Card, HStack, SimpleGrid, Stack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import {
  createLearningItemAction,
  deleteLearningItemAction,
  updateLearningItemAction,
} from '../_actions/learning.action'

interface LearningItemFormProps {
  /** Данные для редактирования (если не переданы — создание) */
  item?: LearningItem | null
  /** Локаль для редиректа */
  locale: string
}

/**
 * Форма создания/редактирования LearningItem
 */
export function LearningItemForm({ item, locale }: LearningItemFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const isEditing = Boolean(item)

  const handleSubmit = useCallback(
    async (data: unknown) => {
      startTransition(async () => {
        const result = isEditing ? await updateLearningItemAction(item!.id, data) : await createLearningItemAction(data)

        if (!result.success) {
          toaster.error({
            title: 'Ошибка',
            description: result.error === 'VALIDATION_ERROR'
              ? 'Проверьте правильность заполнения формы'
              : 'Не удалось сохранить',
          })
          return
        }

        toaster.success({
          title: isEditing ? 'Обновлено' : 'Создано',
          description: 'Данные успешно сохранены',
        })

        router.push(`/${locale}/admin/learning`)
      })
    },
    [isEditing, item, locale, router],
  )

  const handleDelete = useCallback(async () => {
    if (!item || !(await confirm({ title: 'Удалить этот элемент?' }))) {
      return
    }

    startTransition(async () => {
      const result = await deleteLearningItemAction(item.id)

      if (!result.success) {
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось удалить',
        })
        return
      }

      toaster.success({ title: 'Удалено' })
      router.push(`/${locale}/admin/learning`)
    })
  }, [item, locale, router])

  // Начальные значения для формы
  const initialValues = item
    ? {
      title: item.title,
      titleEn: item.titleEn ?? '',
      author: item.author ?? '',
      url: item.url ?? '',
      coverImage: item.coverImage ?? '',
      type: item.type,
      category: item.category ?? '',
      tags: item.tags,
      status: item.status,
      rating: item.rating ?? undefined,
      notes: item.notes ?? '',
      notesEn: item.notesEn ?? '',
      startedAt: item.startedAt ?? undefined,
      completedAt: item.completedAt ?? undefined,
      year: item.year ?? undefined,
      isPublished: item.isPublished,
      isFeatured: item.isFeatured,
      order: item.order,
    }
    : {
      title: '',
      titleEn: '',
      author: '',
      url: '',
      coverImage: '',
      type: 'BOOK' as const,
      category: '',
      tags: [] as string[],
      status: 'WANT_TO_LEARN' as const,
      rating: undefined,
      notes: '',
      notesEn: '',
      startedAt: undefined,
      completedAt: undefined,
      year: undefined,
      isPublished: false,
      isFeatured: false,
      order: 0,
    }

  return (
    <>
      <ConfirmDialog />
      <KamiForm initialValue={initialValues} schema={LearningItemCreateFormSchema} onSubmit={handleSubmit}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{isEditing ? 'Редактирование' : 'Новый элемент'}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              {/* Основная информация */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.String name="title" label="Название" placeholder="Название книги, курса..." required />
                <KamiForm.Field.String name="titleEn" label="Название (EN)" placeholder="English title" />
                <KamiForm.Field.String name="author" label="Автор" placeholder="Имя автора" />
                <KamiForm.Field.String name="url" label="Ссылка" placeholder="https://..." />
              </SimpleGrid>

              {/* Классификация */}
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                <KamiForm.Select.LearningItemType name="type" label="Тип" />
                <KamiForm.Select.LearningStatus name="status" label="Статус" />
                <KamiForm.Field.String name="category" label="Категория" placeholder="programming, design..." />
              </SimpleGrid>

              {/* Медиа */}
              <KamiForm.Field.String name="coverImage" label="URL обложки" placeholder="https://..." />

              {/* Прогресс */}
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                <KamiForm.Field.Number name="rating" label="Оценка (1-5)" min={1} max={5} />
                <KamiForm.Field.Number name="year" label="Год издания" min={1900} max={2100} />
                <KamiForm.Field.Number name="order" label="Порядок" min={0} />
              </SimpleGrid>

              {/* Заметки */}
              <KamiForm.Field.Textarea name="notes" label="Заметки" placeholder="Краткое резюме, мысли..." rows={4} />
              <KamiForm.Field.Textarea name="notesEn" label="Заметки (EN)" placeholder="Notes in English..." rows={4} />

              {/* Публикация */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.Checkbox name="isPublished" label="Опубликовано" />
                <KamiForm.Field.Checkbox name="isFeatured" label="Избранное" />
              </SimpleGrid>
            </Stack>
          </Card.Body>
          <Card.Footer>
            <HStack justify="space-between" w="full">
              <HStack>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/admin/learning`}>Отмена</Link>
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
