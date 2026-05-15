'use client'

import { FormImageUpload } from '@/app/(admin)/admin/_components'
import { useAdminForm } from '@/app/(admin)/admin/_hooks'
import type { ContentPage, Image as ImageModel } from '@/generated/prisma'
import { MandalaForm } from '@/mandala-form'
import { Box, Stack, Text } from '@chakra-ui/react'
import { SeoField, SlugField } from '@letar/admin-ui'
import { type AdminContentPageFormInput, AdminContentPageFormSchema } from '../_schemas/content-page.schema'

interface ContentPageFormProps {
  contentPage?: ContentPage & { ogImageRel?: ImageModel | null }
  onSubmit: (data: AdminContentPageFormInput) => Promise<{ success: boolean; error?: string; field?: string }>
}

export function ContentPageForm({ contentPage, onSubmit }: ContentPageFormProps) {
  const { defaultValues, handleSubmit, persistence, isEditing } = useAdminForm({
    entityKey: 'content-page',
    entity: contentPage,
    toFormValues: (cp) =>
      cp
        ? {
            slug: cp.slug,
            title: cp.title,
            content: cp.content,
            metaTitle: cp.metaTitle || '',
            metaDescription: cp.metaDescription || '',
            ogImageId: cp.ogImageId || '',
            published: cp.published,
          }
        : {
            slug: '',
            title: '',
            content: '',
            metaTitle: '',
            metaDescription: '',
            ogImageId: '',
            published: true,
          },
    onSubmit,
  })

  return (
    <MandalaForm
      initialValue={defaultValues}
      schema={AdminContentPageFormSchema}
      onSubmit={handleSubmit}
      persistence={persistence}
    >
      <MandalaForm.DirtyGuard />
      <Stack gap={6}>
        <SlugField<AdminContentPageFormInput> titleName="title" slugName="slug" isEditing={isEditing} />

        <MandalaForm.Field.RichText
          name="content"
          minHeight="300px"
          maxHeight="600px"
          imageUpload={{
            endpoint: '/api/upload',
            category: 'CONTENT',
          }}
        />

        {/* SEO */}
        <Box borderTopWidth="1px" borderColor="gray.700" pt={6}>
          <Text fontWeight="medium" mb={4}>
            SEO настройки
          </Text>

          <Stack gap={4}>
            <SeoField<AdminContentPageFormInput>
              titleSourceName="title"
              descriptionSourceName="content"
              metaTitleName="metaTitle"
              metaDescriptionName="metaDescription"
              isEditing={isEditing}
            />

            <FormImageUpload
              name="ogImageId"
              label="OG Image (опционально)"
              category="OTHER"
              helperText="Изображение для социальных сетей (1200x630)"
            />
          </Stack>
        </Box>

        <MandalaForm.Field.Switch name="published" />

        <MandalaForm.Errors />

        <MandalaForm.Button.Submit colorPalette="fg">
          {isEditing ? 'Обновить страницу' : 'Создать страницу'}
        </MandalaForm.Button.Submit>
      </Stack>
    </MandalaForm>
  )
}
