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

import { createForm } from '@letar/forms'
import { FieldRichText } from '@letar/forms/rich-text'

// Select компоненты для ENUM'ов
import { SelectDefaultEffect, SelectImageCategory, SelectOrderStatus, SelectUserRole } from './selects'

export const MandalaForm = createForm({
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
  // Тяжёлые поля подключаются через подпуть (в forms 3.0 их нет в ядре); ключ = имя поля
  extraFields: { RichText: FieldRichText },
})
