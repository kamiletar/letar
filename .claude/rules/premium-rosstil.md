---
paths: apps/premium-rosstil/**/*
---

# Правила для Premium Rosstil

## О приложении

Fashion интернет-магазин с полным функционалом e-commerce:

- Каталог товаров с фильтрами и поиском
- Корзина и оформление заказов
- Личный кабинет с мерками и wishlist
- Админ-панель для управления товарами

## Фирменный стиль

```typescript
// Золотой цвет бренда
const brandGold = '#CA9E67'

// Кнопки
<Button colorPalette="fg">Действие</Button>

// Заголовки — шрифт Cormorant Garamond
// Текст — шрифт Tenor Sans
```

## Структура

```
apps/premium-rosstil/
├── src/app/
│   ├── (auth)/          # Авторизация (signin, signup)
│   ├── admin/           # Админ-панель
│   ├── catalog/         # Каталог товаров
│   ├── cart/            # Корзина
│   ├── profile/         # Личный кабинет
│   └── api/             # API роуты
├── schema.zmodel        # Схема БД
└── package.json         # Версия приложения
```

## Особенности

- **Мерки пользователя** — хранятся в UserMeasurement
- **Изображения** — загружаются через `/api/images`, хранятся в `uploads/`
- **Оплата** — интеграция с платёжными системами (в разработке)

## Документация

- README.md — обзор проекта
- PLAN.md — текущие задачи
- PLAN_COMPLETED.md — выполненные задачи
- CHANGELOG.md — история изменений
