---
name: ecommerce-patterns
description: |
  Общие паттерны магазинов монорепо: корзина, варианты товара, заказы, платежи, гостевая корзина через Better Auth anonymous. Загружай ДО правки моделей Cart/Order/OrderItem и actions корзины и когда гость теряет корзину при входе, оформленный заказ меняется вслед за каталогом, удаление товара ломает историю заказов, сумма в копейках падает «out of range for type integer».
---

# E-commerce Patterns

Общие паттерны для магазинов монорепо: корзина, варианты товара, заказы, платежи. Не привязаны
к конкретному приложению — примеры ниже условные, конкретная реализация каждого магазина может
отличаться в деталях.

> Модель корзины/заказа с вариантами товара, снэпшотами и правилом «снять с продажи, а не
> удалить» — подробно и с обоснованием каждого решения: [ecommerce-cart-orders.md](/.claude/docs/ecommerce-cart-orders.md).

## ⚠️ Ловушки (разборы в доках)

- [ecommerce-cart-orders](/.claude/docs/ecommerce-cart-orders.md) — снэпшоты в `OrderItem`, слияние анонимной корзины, «снять с продажи» вместо удаления, anonymous-сессии
- [zenstack-int4-overflow-money-fields](/.claude/docs/zenstack-int4-overflow-money-fields.md) — сумма в копейках в `Int` падает за ≈21,47 млн ₽

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
  total       BigInt      // в копейках (BigInt: Int4 переполняется на ≈21,47 млн ₽)
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

- **MUST** хранить цены в копейках целым числом (не Float); суммы заказов, платежей и итоги — `BigInt`, цену за единицу — `Int`, см. [zenstack-int4-overflow-money-fields](/.claude/docs/zenstack-int4-overflow-money-fields.md)
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
