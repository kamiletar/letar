'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { SeasonCreateFormSchema } from '@/generated/form-schemas/Season.form'
import { GrandSlamCupForm } from '@/grandslamcup-form'
import { transliterate } from '@/lib/transliterate'
import { Button, Flex, Heading, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSeasonAction, updateSeasonAction } from '../_actions/seasons.action'

interface SeasonFormProps {
  season?: {
    id: string
    name: string
    slug: string
    cityId: string
    status: string
    startDate: Date | null
    endDate: Date | null
  } | null
}

export function SeasonForm({ season }: SeasonFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = !!season

  const handleSubmit = async (data: Record<string, unknown>) => {
    const payload = {
      ...data,
      startDate: data.startDate instanceof Date ? data.startDate.toISOString().split('T')[0] : data.startDate,
      endDate: data.endDate instanceof Date ? data.endDate.toISOString().split('T')[0] : data.endDate,
    }

    const result = isEdit ? await updateSeasonAction(season.id, payload) : await createSeasonAction(payload)

    if (result.success) {
      toaster.success({ title: isEdit ? 'Сезон обновлён' : 'Сезон создан' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'seasons'] })
      router.push('/admin/seasons')
    } else {
      toaster.error({ title: result.error })
    }
  }

  return (
    <VStack gap={6} align="stretch" maxW="600px">
      <Heading size="lg">{isEdit ? `Редактировать: ${season.name}` : 'Новый сезон'}</Heading>

      <GrandSlamCupForm
        schema={SeasonCreateFormSchema}
        initialValue={{
          name: season?.name ?? '',
          slug: season?.slug ?? '',
          cityId: season?.cityId ?? '',
          status: (season?.status as 'UPCOMING' | 'ACTIVE' | 'FINISHED') ?? 'UPCOMING',
          startDate: season?.startDate ?? null,
          endDate: season?.endDate ?? null,
        }}
        onSubmit={handleSubmit}
        onFieldChange={!isEdit
          ? {
            name: (value, { setFieldValue }) => {
              setFieldValue('slug', transliterate(String(value ?? '')))
            },
          }
          : undefined}
      >
        <GrandSlamCupForm.Field.String name="name" />
        <GrandSlamCupForm.Field.String name="slug" />
        <GrandSlamCupForm.Select.City name="cityId" />
        <GrandSlamCupForm.Select.SeasonStatus name="status" />
        <GrandSlamCupForm.Field.Date name="startDate" />
        <GrandSlamCupForm.Field.Date name="endDate" />
        <GrandSlamCupForm.Errors />
        <Flex gap={3} pt={2}>
          <GrandSlamCupForm.Button.Submit>{isEdit ? 'Сохранить' : 'Создать'}</GrandSlamCupForm.Button.Submit>
          <Link href="/admin/seasons">
            <Button variant="outline">Отмена</Button>
          </Link>
        </Flex>
      </GrandSlamCupForm>
    </VStack>
  )
}
