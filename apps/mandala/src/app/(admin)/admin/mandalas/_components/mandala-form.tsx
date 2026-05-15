'use client'

import { FormImageUpload } from '@/app/(admin)/admin/_components'
import { createFormPersistence } from '@/app/(admin)/admin/_helpers'
import { toaster } from '@/app/_components/ui/toaster'
import type { Mandala } from '@/generated/prisma'
import { MandalaForm as FormComponent } from '@/mandala-form'
import { Box, Grid, Heading, Separator, Stack } from '@chakra-ui/react'
import { SeoField, SlugField } from '@letar/admin-ui'
import { useMemo } from 'react'
import { type AdminMandalaFormInput, AdminMandalaFormSchema } from '../_schemas/mandala.schema'

interface MandalaFormProps {
  mandala?: Mandala
  onSubmit: (data: AdminMandalaFormInput) => Promise<{ success: boolean; error?: string; field?: string }>
}

export function MandalaForm({ mandala, onSubmit }: MandalaFormProps) {
  const defaultValues: AdminMandalaFormInput = useMemo(
    () =>
      mandala
        ? {
            slug: mandala.slug,
            name: mandala.name,
            description: mandala.description || '',
            imageId: mandala.imageId,
            centerImageId: mandala.centerImageId || '',
            watermarkId: mandala.watermarkId || '',
            ogImageId: mandala.ogImageId || '',
            metaTitle: mandala.metaTitle || '',
            metaDescription: mandala.metaDescription || '',
            metaKeywords: mandala.metaKeywords || '',
            defaultEffectIndex: mandala.defaultEffectIndex,
            order: mandala.order,
            published: mandala.published,
            isSquare: mandala.isSquare,
          }
        : {
            slug: '',
            name: '',
            description: '',
            imageId: '',
            centerImageId: '',
            watermarkId: '',
            ogImageId: '',
            metaTitle: '',
            metaDescription: '',
            metaKeywords: '',
            defaultEffectIndex: 0,
            order: 0,
            published: true,
            isSquare: false,
          },
    [mandala]
  )

  const handleSubmit = async (data: AdminMandalaFormInput) => {
    const result = await onSubmit(data)
    if (!result.success && result.error) {
      toaster.error({ title: result.error })
    }
  }

  return (
    <FormComponent
      initialValue={defaultValues}
      schema={AdminMandalaFormSchema}
      onSubmit={handleSubmit}
      persistence={createFormPersistence('mandala', mandala?.id)}
    >
      <FormComponent.DirtyGuard />
      <Stack gap={6}>
        {/* Основная информация */}
        <Box>
          <Heading size="md" mb={4}>
            Основная информация
          </Heading>
          <Stack gap={4}>
            <SlugField<AdminMandalaFormInput> titleName="name" slugName="slug" isEditing={!!mandala} />

            <FormComponent.Field.Textarea name="description" />

            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={4}>
              <FormComponent.Select.DefaultEffect name="defaultEffectIndex" />
              <FormComponent.Field.NumberInput name="order" />
              <Stack justify="flex-end">
                <FormComponent.Field.Switch name="published" />
                <FormComponent.Field.Switch name="isSquare" />
              </Stack>
            </Grid>
          </Stack>
        </Box>

        <Separator />

        {/* Изображения */}
        <Box>
          <Heading size="md" mb={4}>
            Изображения
          </Heading>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
            <FormImageUpload
              name="imageId"
              label="Основное изображение"
              category="MANDALA"
              required
              helperText="Главное изображение мандалы"
            />

            <FormImageUpload
              name="centerImageId"
              label="Центральный слой"
              category="MANDALA"
              helperText="Вращающийся центр (опционально)"
            />

            <FormImageUpload
              name="watermarkId"
              label="С водяным знаком"
              category="MANDALA"
              helperText="Для шеринга (опционально)"
            />
          </Grid>
        </Box>

        <Separator />

        {/* SEO */}
        <Box>
          <Heading size="md" mb={4}>
            SEO
          </Heading>
          <Stack gap={4}>
            <SeoField<AdminMandalaFormInput>
              titleSourceName="name"
              descriptionSourceName="description"
              metaTitleName="metaTitle"
              metaDescriptionName="metaDescription"
              isEditing={!!mandala}
            />

            <FormComponent.Field.String name="metaKeywords" />

            <FormImageUpload
              name="ogImageId"
              label="OG Image"
              category="MANDALA"
              helperText="Изображение для соцсетей"
            />
          </Stack>
        </Box>

        <Separator />

        <FormComponent.Errors />

        <FormComponent.Button.Submit colorPalette="purple">
          {mandala ? 'Обновить мандалу' : 'Создать мандалу'}
        </FormComponent.Button.Submit>
      </Stack>
    </FormComponent>
  )
}
