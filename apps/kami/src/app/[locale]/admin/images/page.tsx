import type { ImageCategory } from '@/generated/prisma'
import { isAdmin } from '@/lib/auth'
import { ADMIN_PAGE_SIZE } from '@/lib/utils/constants'
import { Card, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'
import { AdminPageLayout } from '../_components/admin-page-layout'
import { getImages } from './_actions/get-images.action'
import { ImageFilters } from './_components/image-filters'
import { ImageUploader } from './_components/image-uploader'
import { ImagesTable } from './_components/images-table'

interface PageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    category?: ImageCategory
    search?: string
    page?: string
  }>
}

export default async function AdminImagesPage({ params, searchParams }: PageProps) {
  const admin = await isAdmin()
  if (!admin) {
    redirect('/sign-in')
  }

  const { locale } = await params
  const search = await searchParams

  // Парсим параметры фильтрации
  const category = search.category as ImageCategory | undefined
  const searchText = search.search
  const page = search.page ? parseInt(search.page, 10) : 1

  // Получаем изображения
  const result = await getImages({
    category,
    search: searchText,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  })

  return (
    <AdminPageLayout
      title="Изображения"
      total={result.total}
      basePath={`/${locale}/admin/images`}
      isEmpty={result.images.length === 0 && !category && !searchText}
      emptyText="Изображений пока нет. Загрузите первое изображение."
      headerExtra={
        <VStack gap={4} align="stretch">
          {/* Загрузчик */}
          <Card.Root>
            <Card.Header>
              <Text fontWeight="semibold">Загрузка изображений</Text>
            </Card.Header>
            <Card.Body pt={0}>
              <ImageUploader />
            </Card.Body>
          </Card.Root>

          {/* Фильтры */}
          <Card.Root>
            <Card.Body>
              <ImageFilters currentCategory={category} currentSearch={searchText} locale={locale} />
            </Card.Body>
          </Card.Root>
        </VStack>
      }
    >
      <ImagesTable images={result.images} />
    </AdminPageLayout>
  )
}
