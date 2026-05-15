'use client'

/**
 * PremiumRosstilForm — расширенный Form компонент для premium-rosstil
 *
 * Включает:
 * - 6 Select компонентов для ENUM'ов приложения
 *
 * @example
 * ```tsx
 * import { PremiumRosstilForm } from '@/premium-rosstil-form'
 *
 * <PremiumRosstilForm initialValue={data} onSubmit={handleSubmit}>
 *   <PremiumRosstilForm.Field.String name="name" label="Имя" />
 *   <PremiumRosstilForm.Select.Gender name="gender" label="Пол" />
 *   <PremiumRosstilForm.Select.OrderStatus name="status" label="Статус заказа" />
 *   <PremiumRosstilForm.Button.Submit>Сохранить</PremiumRosstilForm.Button.Submit>
 * </PremiumRosstilForm>
 * ```
 */

import { createForm, type ExtendedForm } from '@letar/forms'

// Select компоненты для ENUM'ов
import {
  SelectApplicationStatus,
  SelectCustomOrderStatus,
  SelectCustomOrderType,
  SelectGender,
  SelectImageCategory,
  SelectNotificationType,
  SelectOrderStatus,
  SelectPayoutRequestStatus,
  SelectSellerStatus,
  SelectSubOrderStatus,
  SelectUserRole,
  SelectWishlistPriority,
} from './selects'

export const PremiumRosstilForm: ExtendedForm = createForm({
  extraSelects: {
    // Основные справочники
    Gender: SelectGender,
    UserRole: SelectUserRole,

    // Статусы заказов
    OrderStatus: SelectOrderStatus,
    CustomOrderStatus: SelectCustomOrderStatus,
    CustomOrderType: SelectCustomOrderType,

    // Маркетплейс
    SellerStatus: SelectSellerStatus,
    SubOrderStatus: SelectSubOrderStatus,
    ApplicationStatus: SelectApplicationStatus,
    PayoutRequestStatus: SelectPayoutRequestStatus,

    // Дополнительные
    ImageCategory: SelectImageCategory,
    NotificationType: SelectNotificationType,
    WishlistPriority: SelectWishlistPriority,
  },
})
