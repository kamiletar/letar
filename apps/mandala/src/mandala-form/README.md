# MandalaForm

Расширенный Form компонент для Mandala на базе `@letar/forms`.

## Возможности

- **3 Select компонента** для всех ENUM'ов приложения
- **Единый namespace API** для всех полей формы

## Использование

```tsx
import { MandalaForm } from '@/mandala-form'
<MandalaForm initialValue={data} schema={Schema} onSubmit={handleSubmit}>
  {/* Обычные поля */}
  <MandalaForm.Field.String name="name" label="Название" />
  <MandalaForm.Field.Textarea name="description" label="Описание" />

  {/* Select для ENUM'ов */}
  <MandalaForm.Select.UserRole name="role" label="Роль" />
  <MandalaForm.Select.ImageCategory name="category" label="Категория" />
  <MandalaForm.Select.OrderStatus name="status" label="Статус заказа" />

  {/* Кнопки */}
  <MandalaForm.Button.Submit>Сохранить</MandalaForm.Button.Submit>
</MandalaForm>
```

## Select компоненты

| Компонент                          | ENUM          | Значения                                          |
| ---------------------------------- | ------------- | ------------------------------------------------- |
| `MandalaForm.Select.UserRole`      | UserRole      | USER, ADMIN                                       |
| `MandalaForm.Select.ImageCategory` | ImageCategory | MANDALA, PRODUCT, CONTENT, OTHER                  |
| `MandalaForm.Select.OrderStatus`   | OrderStatus   | PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED |

## Labels

Все русские метки экспортируются из модуля:

```tsx
import { imageCategoryLabels, orderStatusLabels, userRoleLabels } from '@/mandala-form'

// Использование
const label = orderStatusLabels['DELIVERED'] // 'Доставлен'
```

## Структура

```
mandala-form/
├── index.ts                    # Экспорты
├── mandala-form.tsx            # createForm() с расширениями
├── labels.ts                   # Русские метки для ENUM'ов
├── selects/                    # Select компоненты
│   ├── index.ts
│   ├── select-user-role.tsx
│   ├── select-image-category.tsx
│   └── select-order-status.tsx
└── README.md
```
