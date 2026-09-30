# Translations Structure

## Организация файлов

```
messages/
├── ru.json           # Русский (полный)
├── en.json           # Английский
└── de.json           # Немецкий

# Или разбитие по доменам
messages/
├── ru/
│   ├── common.json
│   ├── products.json
│   ├── checkout.json
│   └── auth.json
└── en/
    ├── common.json
    └── ...
```

## Структура переводов

```json
// messages/ru.json
{
  "common": {
    "loading": "Загрузка...",
    "error": "Произошла ошибка",
    "save": "Сохранить",
    "cancel": "Отмена",
    "delete": "Удалить",
    "edit": "Редактировать",
    "close": "Закрыть",
    "search": "Поиск",
    "noResults": "Ничего не найдено"
  },

  "auth": {
    "login": "Войти",
    "logout": "Выйти",
    "register": "Регистрация",
    "forgotPassword": "Забыли пароль?",
    "email": "Email",
    "password": "Пароль",
    "confirmPassword": "Подтвердите пароль"
  },

  "products": {
    "title": "Каталог",
    "addToCart": "В корзину",
    "inStock": "В наличии",
    "outOfStock": "Нет в наличии",
    "price": "Цена",
    "quantity": "Количество",
    "size": "Размер",
    "color": "Цвет"
  },

  "cart": {
    "title": "Корзина",
    "empty": "Корзина пуста",
    "total": "Итого",
    "checkout": "Оформить заказ",
    "continueShopping": "Продолжить покупки"
  },

  "validation": {
    "required": "Обязательное поле",
    "email": "Некорректный email",
    "minLength": "Минимум {min} символов",
    "maxLength": "Максимум {max} символов"
  }
}
```

## Интерполяция

```json
{
  "greeting": "Привет, {name}!",
  "items": "У вас {count} товаров в корзине",
  "price": "Цена: {price, number, currency}"
}
```

```tsx
// Использование
const t = useTranslations('common')

t('greeting', { name: 'Иван' })
// → "Привет, Иван!"

t('items', { count: 5 })
// → "У вас 5 товаров в корзине"
```

## Плюрализация

```json
{
  "cart": {
    "itemCount": "{count, plural, =0 {Корзина пуста} one {# товар} few {# товара} many {# товаров} other {# товаров}}"
  }
}
```

```tsx
t('cart.itemCount', { count: 1 }) // → "1 товар"
t('cart.itemCount', { count: 3 }) // → "3 товара"
t('cart.itemCount', { count: 5 }) // → "5 товаров"
t('cart.itemCount', { count: 21 }) // → "21 товар"
```

## Select (выбор по значению)

```json
{
  "orderStatus": "{status, select, pending {Ожидает оплаты} paid {Оплачен} shipped {Отправлен} delivered {Доставлен} other {Неизвестно}}"
}
```

```tsx
t('orderStatus', { status: 'shipped' })
// → "Отправлен"
```

## Rich text (форматирование)

```json
{
  "terms": "Нажимая кнопку, вы соглашаетесь с <link>условиями использования</link>"
}
```

```tsx
t.rich('terms', {
  link: (chunks) => <Link href="/terms">{chunks}</Link>,
})
```

## Вложенные ключи

```tsx
// Доступ к вложенным ключам
const t = useTranslations()

t('products.addToCart') // Точечная нотация
t('validation.minLength', { min: 8 })
```

## Типизация переводов

```typescript
// types/i18n.d.ts
import ru from '../messages/ru.json'

type Messages = typeof ru

declare global {
  // Используется next-intl для типизации
  interface IntlMessages extends Messages {}
}
```

## Загрузка по частям (Code Splitting)

```typescript
// i18n/request.ts
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || 'ru'

  // Загружать только нужные пространства имён
  const [common, products] = await Promise.all([
    import(`../messages/${locale}/common.json`),
    import(`../messages/${locale}/products.json`),
  ])

  return {
    locale,
    messages: {
      common: common.default,
      products: products.default,
    },
  }
})
```

## Динамические ключи

```tsx
// Когда ключ приходит из данных
const statusKey = `status.${order.status}` // status.pending, status.paid, etc.

// ⚠️ Небезопасно — ключ может не существовать
t(statusKey)

// ✅ Безопасно с fallback
t(statusKey, { defaultMessage: order.status })

// Или проверка наличия
const hasKey = t.has(statusKey)
```

## Хелперы для форм

```typescript
// lib/i18n/validation-messages.ts
import { getTranslations } from 'next-intl/server'

export async function getValidationMessages() {
  const t = await getTranslations('validation')

  return {
    required: t('required'),
    email: t('email'),
    minLength: (min: number) => t('minLength', { min }),
    maxLength: (max: number) => t('maxLength', { max }),
  }
}
```

```tsx
// Использование в форме
const messages = await getValidationMessages()

const schema = z.object({
  name: z.string().min(2, messages.minLength(2)),
  email: z.email(messages.email),
})
```

## Правила именования

| Паттерн       | Пример                        | Описание                 |
| ------------- | ----------------------------- | ------------------------ |
| `camelCase`   | `addToCart`                   | Действия, кнопки         |
| `noun`        | `title`, `description`        | Заголовки, описания      |
| `isX`, `hasX` | `isEmpty`, `hasItems`         | Состояния                |
| `xCount`      | `itemCount`, `reviewCount`    | Счётчики с плюрализацией |
| `xError`      | `emailError`, `passwordError` | Сообщения об ошибках     |

## Чеклист для переводов

- [ ] Все тексты вынесены в JSON
- [ ] Нет хардкода в компонентах
- [ ] Плюрализация для счётчиков
- [ ] Интерполяция для динамических значений
- [ ] Типизация для автодополнения
- [ ] Fallback для отсутствующих ключей
