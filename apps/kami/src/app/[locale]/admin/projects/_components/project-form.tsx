'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { ProjectCreateFormSchema } from '@/generated/form-schemas/Project.form'
import type { Project } from '@/generated/prisma'
import { KamiForm } from '@/kami-form'
import { Button, Card, HStack, SimpleGrid, Stack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { createProjectAction, deleteProjectAction, updateProjectAction } from '../_actions/projects.action'

interface ProjectFormProps {
  /** Данные для редактирования (если не переданы — создание) */
  project?: Project | null
  /** Локаль для редиректа */
  locale: string
}

/**
 * Форма создания/редактирования проекта
 */
export function ProjectForm({ project, locale }: ProjectFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const isEditing = Boolean(project)

  const handleSubmit = useCallback(
    async (data: unknown) => {
      startTransition(async () => {
        const submitData = data as Record<string, unknown>

        // Преобразование technologies из строки в массив, если нужно
        if (typeof submitData.technologies === 'string') {
          submitData.technologies = (submitData.technologies as string)
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        }

        const result = isEditing
          ? await updateProjectAction(project!.id, submitData)
          : await createProjectAction(submitData)

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

        router.push(`/${locale}/admin/projects`)
      })
    },
    [isEditing, project, locale, router],
  )

  const handleDelete = useCallback(async () => {
    if (!project || !(await confirm({ title: 'Удалить этот проект?' }))) {
      return
    }

    startTransition(async () => {
      const result = await deleteProjectAction(project.id)

      if (!result.success) {
        toaster.error({
          title: 'Ошибка',
          description: 'Не удалось удалить',
        })
        return
      }

      toaster.success({ title: 'Удалено' })
      router.push(`/${locale}/admin/projects`)
    })
  }, [project, locale, router, confirm])

  const initialValues = project
    ? {
      title: project.title,
      titleEn: project.titleEn,
      slug: project.slug,
      description: project.description,
      descriptionEn: project.descriptionEn,
      image: project.image ?? '',
      demoUrl: project.demoUrl ?? '',
      codeUrl: project.codeUrl ?? '',
      caseUrl: project.caseUrl ?? '',
      featured: project.featured,
      order: project.order,
      technologies: project.technologies,
    }
    : {
      title: '',
      titleEn: '',
      slug: '',
      description: '',
      descriptionEn: '',
      image: '',
      demoUrl: '',
      codeUrl: '',
      caseUrl: '',
      featured: false,
      order: 0,
      technologies: [] as string[],
    }

  return (
    <>
      <ConfirmDialog />
      <KamiForm initialValue={initialValues} schema={ProjectCreateFormSchema} onSubmit={handleSubmit}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{isEditing ? 'Редактирование проекта' : 'Новый проект'}</Card.Title>
          </Card.Header>
          <Card.Body>
            <Stack gap={6}>
              {/* Название */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.String name="title" label="Название (RU)" placeholder="Мой проект" required />
                <KamiForm.Field.String name="titleEn" label="Название (EN)" placeholder="My Project" required />
              </SimpleGrid>

              <KamiForm.Field.String name="slug" label="Slug" placeholder="my-project" required />

              {/* Описание */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.Textarea
                  name="description"
                  label="Описание (RU)"
                  placeholder="Описание проекта..."
                  rows={3}
                  required
                />
                <KamiForm.Field.Textarea
                  name="descriptionEn"
                  label="Описание (EN)"
                  placeholder="Project description..."
                  rows={3}
                  required
                />
              </SimpleGrid>

              {/* Ссылки */}
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
                <KamiForm.Field.String name="demoUrl" label="Demo URL" placeholder="https://..." />
                <KamiForm.Field.String name="codeUrl" label="Code URL (GitHub)" placeholder="https://github.com/..." />
                <KamiForm.Field.String name="caseUrl" label="Case URL" placeholder="https://..." />
              </SimpleGrid>

              {/* Технологии — текстовое поле через запятую */}
              <KamiForm.Field.String
                name="technologies"
                label="Технологии"
                placeholder="Next.js, React, TypeScript, Prisma"
                helperText="Через запятую"
              />

              {/* Порядок и featured */}
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <KamiForm.Field.Number name="order" label="Порядок" min={0} />
                <KamiForm.Field.Checkbox name="featured" label="Избранный проект" />
              </SimpleGrid>
            </Stack>
          </Card.Body>
          <Card.Footer>
            <HStack justify="space-between" w="full">
              <HStack>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/admin/projects`}>Отмена</Link>
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
