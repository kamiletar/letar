/**
 * Русские названия для всех ENUM'ов premium-rosstil
 */

// Пол (Gender)
export const genderLabels: Record<string, string> = {
  MALE: 'Мужской',
  FEMALE: 'Женский',
}

// Роли пользователей (UserRole)
export const userRoleLabels: Record<string, string> = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
}

// Статусы заказов (OrderStatus)
export const orderStatusLabels: Record<string, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
}

// Типы кастомных заказов (CustomOrderType)
export const customOrderTypeLabels: Record<string, string> = {
  MADE_TO_ORDER: 'На заказ',
  CUSTOM_DESIGN: 'Индивидуальный дизайн',
  B2B_PARTNERSHIP: 'B2B партнёрство',
}

// Статусы кастомных заказов (CustomOrderStatus)
export const customOrderStatusLabels: Record<string, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  IN_PRODUCTION: 'В производстве',
  COMPLETED: 'Завершён',
  CANCELLED: 'Отменён',
}

// Категории изображений (ImageCategory)
export const imageCategoryLabels: Record<string, string> = {
  PRODUCT: 'Товар',
  AVATAR: 'Аватар',
  REFERENCE: 'Референс',
  NOTIFICATION: 'Уведомление',
}

// Приоритет в списке желаний (WishlistPriority)
export const wishlistPriorityLabels: Record<string, string> = {
  DREAM: 'Мечта',
  WANT: 'Хочу',
  MAYBE: 'Может быть',
}

// Типы уведомлений (NotificationType)
export const notificationTypeLabels: Record<string, string> = {
  NEW_PRODUCT: 'Новые товары',
  ORDER_STATUS: 'Статус заказа',
  PROMOTION: 'Акции',
  CART_REMINDER: 'Напоминание о корзине',
}

// === Маркетплейс ===

// Статус продавца (SellerStatus)
export const sellerStatusLabels: Record<string, string> = {
  PENDING: 'Ожидает модерации',
  ACTIVE: 'Активен',
  SUSPENDED: 'Приостановлен',
  CLOSED: 'Закрыт',
}

// Статус подзаказа (SubOrderStatus)
export const subOrderStatusLabels: Record<string, string> = {
  PENDING_PAYMENT: 'Ожидает оплаты',
  PAID: 'Оплачен',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  COMPLETED: 'Завершён',
  RETURN_REQUESTED: 'Запрос возврата',
  RETURNED: 'Возвращён',
  CANCELLED: 'Отменён',
}

// Статус заявки (ApplicationStatus)
export const applicationStatusLabels: Record<string, string> = {
  PENDING: 'На рассмотрении',
  UNDER_REVIEW: 'Проверяется',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
}

// Статус запроса на выплату (PayoutRequestStatus)
export const payoutRequestStatusLabels: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING_REVIEW: 'На проверке',
  APPROVED: 'Одобрен',
  PAID: 'Выплачен',
  REJECTED: 'Отклонён',
}

// Система налогообложения (SellerTaxSystem)
export const sellerTaxSystemLabels: Record<string, string> = {
  IP_USN: 'ИП на УСН',
  IP_OSNO: 'ИП на ОСНО',
  IP_PATENT: 'ИП на патенте',
  OOO: 'ООО',
  SELF_EMPLOYED: 'Самозанятый',
}

// Статус выплаты (PayoutStatus)
export const payoutStatusLabels: Record<string, string> = {
  SCHEDULED: 'Запланирована',
  PROCESSING: 'Обрабатывается',
  COMPLETED: 'Выполнена',
  FAILED: 'Ошибка',
}

// Статус возврата (ReturnStatus)
export const returnStatusLabels: Record<string, string> = {
  REQUESTED: 'Запрошен',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
  SHIPPED_BACK: 'Отправлен обратно',
  RECEIVED: 'Получен продавцом',
  REFUNDED: 'Возвращены деньги',
}
