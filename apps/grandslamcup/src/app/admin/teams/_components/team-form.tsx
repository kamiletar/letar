'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { TeamCreateFormSchema } from '@/generated/form-schemas/Team.form'
import { GrandSlamCupForm } from '@/grandslamcup-form'
import { transliterate } from '@/lib/transliterate'
import { Button, Flex, Heading, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createTeamAction, updateTeamAction } from '../_actions/teams.action'

interface TeamFormProps {
  team?: {
    id: string
    name: string
    slug: string
    cityId: string
    homeVenueId: string | null
    telegramLink: string | null
    description: string | null
  } | null
}

export function TeamForm({ team }: TeamFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = !!team

  const handleSubmit = async (data: Record<string, unknown>) => {
    const result = isEdit ? await updateTeamAction(team.id, data) : await createTeamAction(data)

    if (result.success) {
      toaster.success({ title: isEdit ? 'Команда обновлена' : 'Команда создана' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'teams'] })
      router.push('/admin/teams')
    } else {
      toaster.error({ title: result.error })
    }
  }

  return (
    <VStack gap={6} align="stretch" maxW="600px">
      <Heading size="lg">{isEdit ? `Редактировать: ${team.name}` : 'Новая команда'}</Heading>

      <GrandSlamCupForm
        schema={TeamCreateFormSchema}
        initialValue={{
          name: team?.name ?? '',
          slug: team?.slug ?? '',
          cityId: team?.cityId ?? '',
          homeVenueId: team?.homeVenueId ?? '',
          telegramLink: team?.telegramLink ?? '',
          description: team?.description ?? '',
        }}
        onSubmit={handleSubmit}
        onFieldChange={
          !isEdit
            ? {
                name: (value, { setFieldValue }) => {
                  setFieldValue('slug', transliterate(String(value ?? '')))
                },
              }
            : undefined
        }
      >
        <GrandSlamCupForm.Field.String name="name" />
        <GrandSlamCupForm.Field.String name="slug" />
        <GrandSlamCupForm.Select.City name="cityId" />
        <GrandSlamCupForm.Select.Venue name="homeVenueId" clearable />
        <GrandSlamCupForm.Field.String name="telegramLink" />
        <GrandSlamCupForm.Field.Textarea name="description" />
        <GrandSlamCupForm.Errors />
        <Flex gap={3} pt={2}>
          <GrandSlamCupForm.Button.Submit>{isEdit ? 'Сохранить' : 'Создать'}</GrandSlamCupForm.Button.Submit>
          <Link href="/admin/teams">
            <Button variant="outline">Отмена</Button>
          </Link>
        </Flex>
      </GrandSlamCupForm>
    </VStack>
  )
}
