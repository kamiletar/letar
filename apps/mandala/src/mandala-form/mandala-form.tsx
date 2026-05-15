'use client'

/**
 * MandalaForm — расширенный Form компонент для Mandala
 *
 * Включает:
 * - 3 Select компонента для всех ENUM'ов приложения
 *
 * @example
 * ```tsx
 * import { MandalaForm } from '@/mandala-form'
 *
 * <MandalaForm initialValue={data} onSubmit={handleSubmit}>
 *   <MandalaForm.Field.String name="name" label="Название" />
 *   <MandalaForm.Select.ImageCategory name="category" label="Категория" />
 *   <MandalaForm.Select.OrderStatus name="status" label="Статус" />
 *   <MandalaForm.Button.Submit>Сохранить</MandalaForm.Button.Submit>
 * </MandalaForm>
 * ```
 */

import { createForm, type ExtendedForm } from '@letar/forms'

// Select компоненты для ENUM'ов
import { SelectDefaultEffect, SelectImageCategory, SelectOrderStatus, SelectUserRole } from './selects'

export const MandalaForm: ExtendedForm = createForm({
  extraSelects: {
    // Роли пользователей
    UserRole: SelectUserRole,

    // Категории изображений
    ImageCategory: SelectImageCategory,

    // Статусы заказов
    OrderStatus: SelectOrderStatus,

    // Эффект по умолчанию (для мандал)
    DefaultEffect: SelectDefaultEffect,
  },
})
