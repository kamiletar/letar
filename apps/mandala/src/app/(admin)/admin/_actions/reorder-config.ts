/**
 * Конфигурации для переупорядочивания моделей.
 */
export const REORDER_CONFIGS = {
  mandala: {
    modelName: 'мандал',
    revalidatePaths: ['/admin/mandalas', '/mandalas', '/'],
  },
  product: {
    modelName: 'товаров',
    revalidatePaths: ['/admin/products', '/shop'],
  },
} as const

export type ReorderableModel = keyof typeof REORDER_CONFIGS
