'use client'

import { FormImageUpload } from '@/app/(admin)/admin/_components'
import { createFormPersistence } from '@/app/(admin)/admin/_helpers'
import { toaster } from '@/app/_components/ui/toaster'
import type { Image as ImageModel, Product } from '@/generated/prisma'
import { MandalaForm } from '@/mandala-form'
import { Box, Stack, Text } from '@chakra-ui/react'
import { SeoField, SlugField } from '@letar/admin-ui'
import { useMemo, useState } from 'react'
import { type AdminProductFormInput, AdminProductFormSchema, type ProductImageInput } from '../_schemas/product.schema'
import { ProductImagesUpload, type ProductImageWithImage } from './product-images-upload'

interface ProductFormProps {
  product?: Product & { images?: ProductImageWithImage[]; ogImageRel?: ImageModel | null }
  onSubmit: (data: AdminProductFormInput) => Promise<{ success: boolean; error?: string; field?: string }>
}

export function ProductForm({ product, onSubmit }: ProductFormProps) {
  // Состояние изображений (управляется отдельно от формы)
  const [productImages, setProductImages] = useState<ProductImageInput[]>(
    product?.images?.map((img) => ({ imageId: img.imageId, order: img.order })) ?? [],
  )

  const defaultValues: AdminProductFormInput = useMemo(
    () =>
      product
        ? {
          slug: product.slug,
          name: product.name,
          description: product.description,
          price: product.price,
          productImages: product.images?.map((img) => ({ imageId: img.imageId, order: img.order })) ?? [],
          metaTitle: product.metaTitle || '',
          metaDescription: product.metaDescription || '',
          ogImageId: product.ogImageId || '',
          order: product.order,
          published: product.published,
          stock: product.stock,
        }
        : {
          slug: '',
          name: '',
          description: '',
          price: 0,
          productImages: [],
          metaTitle: '',
          metaDescription: '',
          ogImageId: '',
          order: 0,
          published: true,
          stock: 1,
        },
    [product],
  )

  const handleSubmit = async (data: AdminProductFormInput) => {
    // Добавляем изображения из отдельного состояния
    const dataWithImages = {
      ...data,
      productImages,
    }

    const result = await onSubmit(dataWithImages)
    if (!result.success && result.error) {
      toaster.error({ title: result.error })
    }
  }

  return (
    <MandalaForm
      initialValue={defaultValues}
      schema={AdminProductFormSchema}
      onSubmit={handleSubmit}
      persistence={createFormPersistence('product', product?.id)}
    >
      <MandalaForm.DirtyGuard />
      <Stack gap={6}>
        {/* Основные поля */}
        <SlugField<AdminProductFormInput> titleName="name" slugName="slug" isEditing={!!product} />

        <MandalaForm.Field.Textarea name="description" rows={4} />

        <MandalaForm.Field.NumberInput name="price" />

        {/* Изображения товара */}
        <Box>
          <ProductImagesUpload
            productId={product?.id}
            initialImages={product?.images}
            onChange={setProductImages}
            disabled={false}
          />
        </Box>

        {/* SEO */}
        <Box borderTopWidth="1px" borderColor="gray.700" pt={6}>
          <Text fontWeight="medium" mb={4}>
            SEO настройки
          </Text>

          <Stack gap={4}>
            <SeoField<AdminProductFormInput>
              titleSourceName="name"
              descriptionSourceName="description"
              metaTitleName="metaTitle"
              metaDescriptionName="metaDescription"
              isEditing={!!product}
            />

            <FormImageUpload
              name="ogImageId"
              label="OG Image (опционально)"
              category="OTHER"
              helperText="Если не указано — автоматически из первого изображения товара"
            />
          </Stack>
        </Box>

        {/* Настройки */}
        <Box borderTopWidth="1px" borderColor="gray.700" pt={6}>
          <Stack direction={{ base: 'column', md: 'row' }} gap={4}>
            <MandalaForm.Field.NumberInput name="order" />
            <MandalaForm.Field.NumberInput name="stock" />
          </Stack>

          <Stack direction="row" gap={6} mt={4}>
            <MandalaForm.Field.Switch name="published" />
          </Stack>
        </Box>

        <MandalaForm.Errors />

        <MandalaForm.Button.Submit colorPalette="fg">
          {product ? 'Обновить товар' : 'Создать товар'}
        </MandalaForm.Button.Submit>
      </Stack>
    </MandalaForm>
  )
}
