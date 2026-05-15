import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { fetchCatalogProducts } from '../_actions/fetch-catalog-products'
import { ProductsListClient } from './products-list-client'

interface ProductsListProps {
  category?: string
  gender?: Gender
  newCollection?: boolean
  sort?: string
  page?: number
  query?: string
  color?: string
  size?: string
  minPrice?: number
  maxPrice?: number
  seller?: string
}

/** Server Component: получает начальные данные и передаёт в клиентский компонент */
export async function ProductsList(props: ProductsListProps) {
  const session = await getSession()

  // Начальные данные для SSR (TanStack Query использует их как initialData)
  const initialData = await fetchCatalogProducts({
    ...props,
    page: props.page ?? 1,
  })

  return <ProductsListClient initialData={initialData} isAuthenticated={!!session?.user} />
}
