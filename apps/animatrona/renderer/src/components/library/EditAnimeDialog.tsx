'use client'

/**
 * Диалог редактирования аниме
 */

import { Button, CloseButton, Dialog, HStack, Portal, Text, VStack } from '@chakra-ui/react'
import { Form, useDeclarativeForm } from '@letar/forms'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'
import { z } from 'zod/v4'

import { toaster } from '@/components/ui/toaster'

import type { Anime, AnimeStatus } from '@/generated/prisma'
import { useUpdateAnime } from '@/lib/hooks'
import { useAnimeDetails } from '@/lib/shikimori/hooks'

/** Схема формы редактирования */
const EditAnimeFormSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  originalName: z.string().optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  status: z.enum(['ONGOING', 'COMPLETED', 'ANNOUNCED']),
  episodeCount: z.number().int().min(0).default(0),
  rating: z.number().min(0).max(10).optional(),
  rutrackerUrl: z.string().url('Некорректный URL').optional().or(z.literal('')),
})

type EditAnimeForm = z.infer<typeof EditAnimeFormSchema>

interface EditAnimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anime: Anime
  onUpdated?: () => void
}

/** Кнопка обновления с Shikimori (внутри формы) */
function ShikimoriRefreshButton({ shikimoriId }: { shikimoriId: number | null }) {
  const { form } = useDeclarativeForm()
  const { fetchDetails, isLoading } = useAnimeDetails()
  const [error, setError] = useState<string | null>(null)

  if (!shikimoriId) {
    return null
  }

  const handleRefresh = async () => {
    setError(null)

    const details = await fetchDetails(shikimoriId)
    if (details) {
      if (details.score) {
        form.setFieldValue('rating', details.score)
      }
      if (details.episodes) {
        form.setFieldValue('episodeCount', details.episodes)
      }
    } else {
      setError('Не удалось получить данные с Shikimori')
    }
  }

  return (
    <>
      <Button size="xs" variant="ghost" colorPalette="purple" onClick={handleRefresh} disabled={isLoading}>
        <LuRefreshCw style={{ animation: isLoading ? 'spin 1s linear infinite' : undefined }} />
        Обновить с Shikimori
      </Button>
      {error && (
        <Text color="red.400" fontSize="sm" mt={1}>
          {error}
        </Text>
      )}
    </>
  )
}

/**
 * Диалог редактирования аниме
 */
export function EditAnimeDialog({ open, onOpenChange, anime, onUpdated }: EditAnimeDialogProps) {
  const queryClient = useQueryClient()
  const updateAnime = useUpdateAnime()

  /** Начальные значения из текущего аниме */
  const initialValues: EditAnimeForm = {
    name: anime.name,
    originalName: anime.originalName ?? undefined,
    year: anime.year ?? undefined,
    status: anime.status as AnimeStatus,
    episodeCount: anime.episodeCount,
    rating: anime.rating ?? undefined,
    rutrackerUrl: anime.rutrackerUrl ?? '',
  }

  const handleSubmit = async (data: EditAnimeForm) => {
    try {
      await updateAnime.mutateAsync({
        where: { id: anime.id },
        data: {
          name: data.name,
          originalName: data.originalName || null,
          year: data.year ?? null,
          status: data.status,
          episodeCount: data.episodeCount,
          rating: data.rating ?? null,
          rutrackerUrl: data.rutrackerUrl || null,
        },
      })

      // Инвалидируем кэш
      await queryClient.invalidateQueries({ queryKey: ['animes'] })

      // Уведомляем родителя
      onUpdated?.()

      // Закрываем диалог
      onOpenChange(false)

      toaster.success({
        title: 'Аниме обновлено',
      })
    } catch (error) {
      console.error('Ошибка обновления аниме:', error)
      toaster.error({
        title: 'Ошибка сохранения',
        description: error instanceof Error ? error.message : 'Не удалось обновить аниме',
      })
    }
  }

  return (
    <Dialog.Root
      lazyMount
      open={open}
      onOpenChange={(e) => onOpenChange(e.open)}
      size="lg"
      scrollBehavior="inside"
      closeOnInteractOutside={false}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.panel" borderColor="border.subtle">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title>Редактировать аниме</Dialog.Title>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            <Dialog.Body py={4}>
              <Form schema={EditAnimeFormSchema} initialValue={initialValues} onSubmit={handleSubmit}>
                <VStack gap={4} align="stretch">
                  {/* Название */}
                  <Form.Field.String name="name" label="Название" />
                  <Form.Field.String name="originalName" label="Оригинальное название" />

                  <HStack gap={4}>
                    <Form.Field.NumberInput name="year" label="Год" />
                    <Form.Field.NumberInput name="episodeCount" label="Кол-во эпизодов" />
                  </HStack>

                  {/* Статус */}
                  <Form.Field.Select
                    name="status"
                    label="Статус"
                    options={[
                      { value: 'ONGOING', label: 'Выходит' },
                      { value: 'COMPLETED', label: 'Завершён' },
                      { value: 'ANNOUNCED', label: 'Анонс' },
                    ]}
                  />

                  {/* Рейтинг звёздами */}
                  <Form.Field.Rating name="rating" label="Рейтинг" count={10} allowHalf colorPalette="yellow" />

                  {/* Ссылка на Rutracker */}
                  <Form.Field.String
                    name="rutrackerUrl"
                    label="Rutracker URL"
                    placeholder="https://rutracker.org/forum/viewtopic.php?t=..."
                  />

                  {/* Кнопка обновления из Shikimori */}
                  <ShikimoriRefreshButton shikimoriId={anime.shikimoriId} />

                  {/* Кнопки */}
                  <HStack justify="flex-end" pt={4}>
                    <Dialog.ActionTrigger asChild>
                      <Button variant="outline">Отмена</Button>
                    </Dialog.ActionTrigger>
                    <Form.Button.Submit colorPalette="purple" disabled={updateAnime.isPending}>
                      {updateAnime.isPending ? 'Сохранение...' : 'Сохранить'}
                    </Form.Button.Submit>
                  </HStack>
                </VStack>
              </Form>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
