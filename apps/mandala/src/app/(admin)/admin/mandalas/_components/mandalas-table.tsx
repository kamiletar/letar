'use client'

import { type ColumnDef, commonBulkActions, GenericAdminTable, StatusBadge } from '@letar/admin-ui'
import { bulkDeleteMandalas, bulkPublishMandalas, bulkUnpublishMandalas } from '../_actions/bulk-actions'
import { reorderMandalas } from '../_actions/reorder-mandalas.action'

interface Mandala {
  id: string
  slug: string
  name: string
  order: number
  published: boolean
}

interface MandalasTableProps {
  mandalas: Mandala[]
}

/** Колонки таблицы мандал */
const columns: ColumnDef<Mandala>[] = [
  { header: 'Slug', accessor: 'slug', fontFamily: 'mono', fontSize: 'sm' },
  { header: 'Название', accessor: 'name', fontWeight: 'medium' },
  {
    header: 'Статус',
    accessor: (m) => <StatusBadge type="published" value={m.published} />,
  },
]

/**
 * Таблица мандал с DnD и bulk actions.
 * Использует GenericAdminTable для унификации кода.
 */
export function MandalasTable({ mandalas }: MandalasTableProps) {
  return (
    <GenericAdminTable
      items={mandalas}
      columns={columns}
      reorderAction={reorderMandalas}
      bulkActions={(handle) => [
        commonBulkActions.publish((ids) => handle(() => bulkPublishMandalas(ids))),
        commonBulkActions.unpublish((ids) => handle(() => bulkUnpublishMandalas(ids))),
        commonBulkActions.delete((ids) => handle(() => bulkDeleteMandalas(ids))),
      ]}
      viewHref="/admin/mandalas"
      editHref="/admin/mandalas"
      showOrderColumn
    />
  )
}
