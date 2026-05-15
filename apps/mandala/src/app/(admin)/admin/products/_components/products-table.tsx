'use client'

import { HStack } from '@chakra-ui/react'
import { type ColumnDef, commonBulkActions, GenericAdminTable, StatusBadge } from '@letar/admin-ui'
import { bulkDeleteProducts, bulkPublishProducts, bulkUnpublishProducts } from '../_actions/bulk-actions'
import { reorderProducts } from '../_actions/reorder-products.action'

interface Product {
  id: string
  slug: string
  name: string
  price: number
  order: number
  published: boolean
  inStock: boolean
}

interface ProductsTableProps {
  products: Product[]
}

/** Колонки таблицы товаров */
const columns: ColumnDef<Product>[] = [
  { header: 'Slug', accessor: 'slug', fontFamily: 'mono', fontSize: 'sm' },
  { header: 'Название', accessor: 'name', fontWeight: 'medium' },
  { header: 'Цена', accessor: (p) => `${p.price} руб` },
  {
    header: 'Статус',
    accessor: (p) => (
      <HStack gap={2}>
        <StatusBadge type="published" value={p.published} />
        <StatusBadge type="inStock" value={p.inStock} />
      </HStack>
    ),
  },
]

/**
 * Таблица товаров с DnD и bulk actions.
 * Использует GenericAdminTable для унификации кода.
 */
export function ProductsTable({ products }: ProductsTableProps) {
  return (
    <GenericAdminTable
      items={products}
      columns={columns}
      reorderAction={reorderProducts}
      bulkActions={(handle) => [
        commonBulkActions.publish((ids) => handle(() => bulkPublishProducts(ids))),
        commonBulkActions.unpublish((ids) => handle(() => bulkUnpublishProducts(ids))),
        commonBulkActions.delete((ids) => handle(() => bulkDeleteProducts(ids))),
      ]}
      viewHref="/admin/products"
      editHref="/admin/products"
    />
  )
}
