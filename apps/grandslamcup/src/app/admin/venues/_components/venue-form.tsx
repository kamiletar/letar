'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { VenueCreateFormSchema } from '@/generated/form-schemas/Venue.form'
import { GrandSlamCupForm } from '@/grandslamcup-form'
import { transliterate } from '@/lib/transliterate'
import { Button, Flex, Heading, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createVenueAction, updateVenueAction } from '../_actions/venues.action'

interface VenueData {
  id: string
  name: string
  slug: string
  cityId: string
  address: string | null
  telegramLink: string | null
  websiteUrl: string | null
  description: string | null
}

interface VenueFormProps {
  venue?: VenueData | null
  /** Предвыбранный город (для организатора одного города) */
  defaultCityId?: string
}

export function VenueForm({ venue, defaultCityId }: VenueFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = !!venue

  const handleSubmit = async (data: Record<string, unknown>) => {
    const result = isEdit ? await updateVenueAction(venue.id, data) : await createVenueAction(data)

    if (result.success) {
      toaster.success({ title: isEdit ? 'Площадка обновлена' : 'Площадка создана' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'venues'] })
      router.push('/admin/venues')
    } else {
      toaster.error({ title: result.error })
    }
  }

  return (
    <VStack gap={6} align="stretch" maxW="600px">
      <Heading size="lg">{isEdit ? `Редактировать: ${venue.name}` : 'Новая площадка'}</Heading>

      <GrandSlamCupForm
        schema={VenueCreateFormSchema}
        initialValue={{
          name: venue?.name ?? '',
          slug: venue?.slug ?? '',
          cityId: venue?.cityId ?? defaultCityId ?? '',
          address: venue?.address ?? '',
          description: venue?.description ?? '',
          telegramLink: venue?.telegramLink ?? '',
          websiteUrl: venue?.websiteUrl ?? '',
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
        <GrandSlamCupForm.Field.String name="address" />
        <GrandSlamCupForm.Field.Textarea name="description" />
        <GrandSlamCupForm.Field.String name="telegramLink" />
        <GrandSlamCupForm.Field.String name="websiteUrl" />
        <GrandSlamCupForm.Errors />
        <Flex gap={3} pt={2}>
          <GrandSlamCupForm.Button.Submit>{isEdit ? 'Сохранить' : 'Создать'}</GrandSlamCupForm.Button.Submit>
          <Link href="/admin/venues">
            <Button variant="outline">Отмена</Button>
          </Link>
        </Flex>
      </GrandSlamCupForm>
    </VStack>
  )
}
