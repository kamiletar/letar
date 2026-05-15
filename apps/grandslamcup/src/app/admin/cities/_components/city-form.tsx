'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { CityCreateFormSchema } from '@/generated/form-schemas/City.form'
import { GrandSlamCupForm } from '@/grandslamcup-form'
import { transliterate } from '@/lib/transliterate'
import { Button, Flex, Heading, VStack } from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCityAction, updateCityAction } from '../_actions/cities.action'

interface CityFormProps {
  city?: { id: string; name: string; slug: string; telegramChatId?: string | null } | null
}

export function CityForm({ city }: CityFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const isEdit = !!city

  const handleSubmit = async (data: { name: string; slug: string }) => {
    const result = isEdit ? await updateCityAction(city.id, data) : await createCityAction(data)

    if (result.success) {
      toaster.success({ title: isEdit ? 'Город обновлён' : 'Город создан' })
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cities'] })
      router.push('/admin/cities')
    } else {
      toaster.error({ title: result.error })
    }
  }

  return (
    <VStack gap={6} align="stretch" maxW="500px">
      <Heading size="lg">{isEdit ? `Редактировать: ${city.name}` : 'Новый город'}</Heading>

      <GrandSlamCupForm
        schema={CityCreateFormSchema}
        initialValue={{
          name: city?.name ?? '',
          slug: city?.slug ?? '',
          telegramChatId: city?.telegramChatId ?? '',
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
        <GrandSlamCupForm.Field.String name="telegramChatId" />
        <GrandSlamCupForm.Errors />
        <Flex gap={3} pt={2}>
          <GrandSlamCupForm.Button.Submit>{isEdit ? 'Сохранить' : 'Создать'}</GrandSlamCupForm.Button.Submit>
          <Link href="/admin/cities">
            <Button variant="outline">Отмена</Button>
          </Link>
        </Flex>
      </GrandSlamCupForm>
    </VStack>
  )
}
