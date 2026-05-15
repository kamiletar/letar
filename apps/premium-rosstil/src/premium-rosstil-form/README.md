# PremiumRosstilForm

Расширенный Form компонент для Premium Rosstil на базе `@letar/forms`.

## Возможности

- **8 Select компонентов** для всех ENUM'ов приложения
- **Единый namespace API** для всех полей формы
- **Русские метки** для всех enum значений

## Использование

```tsx
import { PremiumRosstilForm } from '@/premium-rosstil-form'
;<PremiumRosstilForm initialValue={data} schema={Schema} onSubmit={handleSubmit}>
  {/* Обычные поля */}
  <PremiumRosstilForm.Field.String name="name" label="Название" />
  <PremiumRosstilForm.Field.Textarea name="description" label="Описание" />

  {/* Select для ENUM'ов */}
  <PremiumRosstilForm.Select.Gender name="gender" label="Пол" />
  <PremiumRosstilForm.Select.OrderStatus name="status" label="Статус заказа" />
  <PremiumRosstilForm.Select.CustomOrderType name="type" label="Тип заказа" />

  {/* Кнопки */}
  <PremiumRosstilForm.Button.Submit colorPalette="fg">Сохранить</PremiumRosstilForm.Button.Submit>
</PremiumRosstilForm>
```

## Select компоненты

| Компонент                                     | ENUM              | Значения                                                  |
| --------------------------------------------- | ----------------- | --------------------------------------------------------- |
| `PremiumRosstilForm.Select.Gender`            | Gender            | MALE, FEMALE                                              |
| `PremiumRosstilForm.Select.UserRole`          | UserRole          | USER, ADMIN                                               |
| `PremiumRosstilForm.Select.OrderStatus`       | OrderStatus       | NEW, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED |
| `PremiumRosstilForm.Select.CustomOrderStatus` | CustomOrderStatus | NEW, CONFIRMED, IN_PRODUCTION, COMPLETED, CANCELLED       |
| `PremiumRosstilForm.Select.CustomOrderType`   | CustomOrderType   | MADE_TO_ORDER, CUSTOM_DESIGN, B2B_PARTNERSHIP             |
| `PremiumRosstilForm.Select.ImageCategory`     | ImageCategory     | PRODUCT, AVATAR, REFERENCE, NOTIFICATION                  |
| `PremiumRosstilForm.Select.NotificationType`  | NotificationType  | NEW_PRODUCT, ORDER_STATUS, PROMOTION, CART_REMINDER       |
| `PremiumRosstilForm.Select.WishlistPriority`  | WishlistPriority  | DREAM, WANT, MAYBE                                        |

## Labels

Все русские метки экспортируются из модуля:

```tsx
import {
  customOrderStatusLabels,
  customOrderTypeLabels,
  genderLabels,
  imageCategoryLabels,
  notificationTypeLabels,
  orderStatusLabels,
  userRoleLabels,
  wishlistPriorityLabels,
} from '@/premium-rosstil-form'

// Использование
const label = orderStatusLabels['DELIVERED'] // 'Доставлен'
```

## Структура

```
premium-rosstil-form/
├── index.ts                          # Экспорты
├── premium-rosstil-form.tsx          # createForm() с расширениями
├── labels.ts                         # Русские метки для ENUM'ов
├── selects/                          # Select компоненты
│   ├── index.ts
│   ├── select-gender.tsx
│   ├── select-user-role.tsx
│   ├── select-order-status.tsx
│   ├── select-custom-order-status.tsx
│   ├── select-custom-order-type.tsx
│   ├── select-image-category.tsx
│   ├── select-notification-type.tsx
│   └── select-wishlist-priority.tsx
└── README.md
```

## Примечание

Используй `colorPalette="fg"` для кнопок — это фирменный золотой цвет Premium Rosstil (#CA9E67).
