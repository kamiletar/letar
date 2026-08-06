'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { SkillCreateFormSchema } from '@/generated/form-schemas/Skill.form'
import type { Skill, SkillCategory } from '@/generated/prisma'
import { KamiForm } from '@/kami-form'
import { Box, Button, Card, HStack, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { createSkillAction, deleteSkillAction, updateSkillAction } from '../_actions/skills.action'

interface SkillFormProps {
  /** Данные для редактирования (если не переданы — создание) */
  skill?: Skill | null
  /** Список категорий для выбора */
  categories: Pick<SkillCategory, 'id' | 'name'>[]
  /** Локаль для редиректа */
  locale: string
}

/** Вычисляет количество лет опыта от года начала */
function calculateYearsFromStartYear(startYear: number): number {
  const currentYear = new Date().getFullYear()
  return Math.max(0, currentYear - startYear)
}

/**
 * Форма создания/редактирования Skill
 */
export function SkillForm({ skill, categories, locale }: SkillFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const isEditing = Boolean(skill)

  // Режим ввода опыта: 'years' — вручную, 'startYear' — автоматически от года
  const [experienceMode, setExperienceMode] = useState<'years' | 'startYear'>(skill?.startYear ? 'startYear' : 'years')

  const handleSubmit = useCallback(
    async (data: unknown) => {
      startTransition(async () => {
        // Если режим startYear, очищаем years (будет вычисляться динамически)
        const submitData = data as Record<string, unknown>
        if (experienceMode === 'startYear') {
          submitData.years = undefined
        } else {
          submitData.startYear = undefined
        }

        const result = isEditing ? await updateSkillAction(skill!.id, submitData) : await createSkillAction(submitData)

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

        router.push(`/${locale}/admin/skills`)
      })
    },
    [isEditing, skill, locale, router, experienceMode],
  )

  const handleDelete = useCallback(async () => {
    if (!skill || !(await confirm({ title: 'Удалить этот навык?' }))) {
      return
    }

    startTransition(async () => {
      const result = await deleteSkillAction(skill.id)

      if (!result.success) {
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось удалить',
        })
        return
      }

      toaster.success({ title: 'Удалено' })
      router.push(`/${locale}/admin/skills`)
    })
  }, [skill, locale, router])

  // Опции для select категории
  const categoryOptions = categories.map((cat) => ({
    value: cat.id,
    title: cat.name,
  }))

  // Начальные значения для формы
  const initialValues = skill
    ? {
      name: skill.name,
      slug: skill.slug,
      level: skill.level,
      years: skill.years ?? undefined,
      startYear: skill.startYear ?? undefined,
      icon: skill.icon ?? '',
      description: skill.description ?? '',
      url: skill.url ?? '',
      order: skill.order,
      featured: skill.featured,
      categoryId: skill.categoryId,
    }
    : {
      name: '',
      slug: '',
      level: 'INTERMEDIATE' as const,
      years: undefined,
      startYear: undefined,
      icon: '',
      description: '',
      url: '',
      order: 0,
      featured: false,
      categoryId: categories[0]?.id ?? '',
    }

  const calculatedYears = skill?.startYear ? calculateYearsFromStartYear(skill.startYear) : null

  return (
    <>
      <ConfirmDialog />
      <KamiForm initialValue={initialValues} schema={SkillCreateFormSchema} onSubmit={handleSubmit}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{isEditing ? 'Редактирование навыка' : 'Новый навык'}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              {/* Основная информация */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.String name="name" label="Название" placeholder="React, TypeScript..." required />
                <KamiForm.Field.String name="slug" label="Slug" placeholder="react, typescript..." required />
              </SimpleGrid>

              {/* Категория и уровень */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.NativeSelect name="categoryId" label="Категория" options={categoryOptions} required />
                <KamiForm.Select.SkillLevel name="level" label="Уровень" />
              </SimpleGrid>

              {/* Опыт работы */}
              <Box>
                <Text fontWeight="medium" mb={2}>
                  Опыт работы
                </Text>
                <HStack gap={2} mb={3}>
                  <Button
                    size="sm"
                    variant={experienceMode === 'years' ? 'solid' : 'outline'}
                    colorPalette={experienceMode === 'years' ? 'purple' : 'gray'}
                    onClick={() => setExperienceMode('years')}
                  >
                    Указать лет
                  </Button>
                  <Button
                    size="sm"
                    variant={experienceMode === 'startYear' ? 'solid' : 'outline'}
                    colorPalette={experienceMode === 'startYear' ? 'purple' : 'gray'}
                    onClick={() => setExperienceMode('startYear')}
                  >
                    Указать год начала
                  </Button>
                </HStack>

                {experienceMode === 'years'
                  ? (
                    <KamiForm.Field.Number
                      name="years"
                      label="Лет опыта"
                      placeholder="9"
                      min={0}
                      max={50}
                      step={0.5}
                      helperText="Введите количество лет опыта вручную"
                    />
                  )
                  : (
                    <Stack gap={2}>
                      <KamiForm.Field.Number
                        name="startYear"
                        label="Год начала практики"
                        placeholder="2016"
                        min={1990}
                        max={new Date().getFullYear()}
                        helperText={`Количество лет будет обновляться автоматически. ${
                          calculatedYears !== null ? `Сейчас: ${calculatedYears} лет` : ''
                        }`}
                      />
                    </Stack>
                  )}
              </Box>

              {/* Дополнительно */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.String name="icon" label="Иконка" placeholder="Название иконки или URL" />
                <KamiForm.Field.String name="url" label="Ссылка" placeholder="https://..." />
              </SimpleGrid>

              <KamiForm.Field.Textarea
                name="description"
                label="Описание"
                placeholder="Краткое описание навыка..."
                rows={3}
              />

              {/* Порядок и featured */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.Number name="order" label="Порядок" min={0} />
                <KamiForm.Field.Checkbox name="featured" label="Выделенный навык" />
              </SimpleGrid>
            </Stack>
          </Card.Body>
          <Card.Footer>
            <HStack justify="space-between" w="full">
              <HStack>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/admin/skills`}>Отмена</Link>
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
