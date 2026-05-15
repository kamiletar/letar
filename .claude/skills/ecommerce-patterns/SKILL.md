---
name: ecommerce-patterns
description: |
  Паттерны e-commerce для premium-rosstil. Используй при:
  - Работе с корзиной покупок
  - Оформлении заказов
  - Интеграции платёжных систем
  - Управлении инвентарём и ценами
---

# E-commerce Patterns

Паттерны для интернет-магазина premium-rosstil: корзина, заказы, платежи.

## Когда использовать

- Работа с корзиной покупок
- Создание/изменение заказов
- Интеграция платёжных систем
- Управление скидками и промокодами

## Основные сущности

```zmodel
model Cart {
  id        String     @id @default(cuid())
  userId    String     @unique
  user      User       @relation(...)
  items     CartItem[]
  updatedAt DateTime   @updatedAt
}

model Order {
  id          String      @id @default(cuid())
  userId      String
  status      OrderStatus @default(PENDING)
  items       OrderItem[]
  total       Int         // в копейках
  payment     Payment?
  createdAt   DateTime    @default(now())
}
```

## Статусы заказа

```typescript
enum OrderStatus {
  PENDING     // Ожидает оплаты
  PAID        // Оплачен
  PROCESSING  // В обработке
  SHIPPED     // Отправлен
  DELIVERED   // Доставлен
  CANCELLED   // Отменён
}
```

## Критичные правила

- **MUST** хранить цены в копейках (Int, не Float)
- **MUST** валидировать наличие товара перед оформлением
- **SHOULD** использовать транзакции для критичных операций
- **NEVER** хранить данные карт в БД

## Reference файлы

- `reference/cart-patterns.md` — работа с корзиной
- `reference/order-workflow.md` — жизненный цикл заказа
- `reference/payment-integration.md` — интеграция платежей
- `reference/inventory.md` — управление наличием
- `reference/pricing-discounts.md` — цены и скидки
- `reference/checkout-flow.md` — процесс оформления
