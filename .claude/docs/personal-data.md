# Персональные данные, Cookie-согласия и РКН

> **Эталонная реализация:** `apps/aboi` — полный пример: регистрация в РКН, cookie-баннер, согласия в формах, политика ПДн, журнал согласий.

---

## 1. Регистрация в РКН (152-ФЗ)

**Любое приложение, собирающее ПД граждан РФ, обязано быть зарегистрировано как оператор ПДн.**

### Как подать

1. Перейти на **pd.rkn.gov.ru** → «Форма уведомления»
2. Авторизоваться через **Госуслуги (ЕСИА)** — нужен аккаунт ИП/ЮЛ
3. Заполнить форму (данные см. ниже) → получить PDF с номером оператора

### Типовые данные для формы

| Поле                    | Значение                                                            |
| ----------------------- | ------------------------------------------------------------------- |
| Цель обработки          | «Подготовка, заключение и исполнение гражданско-правового договора» |
| Правовое основание      | Ст. 6 ч. 5 п. 5 ФЗ-152 (исполнение договора) + согласие субъекта    |
| Категории субъектов     | Клиенты; Посетители сайта                                           |
| Трансграничная передача | Нет                                                                 |
| Место хранения          | Россия (сервера в РФ — обязательно, ст. 18 ч. 5 ФЗ-152)             |

### Какие ПД отмечать

Отмечать **только то, что реально собирается**:

| Поле                                          | Когда отмечать                                      |
| --------------------------------------------- | --------------------------------------------------- |
| ФИО                                           | Оформление заказа, аккаунт                          |
| Email                                         | Аккаунт, уведомления                                |
| Телефон                                       | Доставка, связь                                     |
| Адрес места жительства                        | Адрес доставки                                      |
| Дата рождения                                 | Только если используется (например, промокод на ДР) |
| Пол                                           | Только если используется (обращение в письмах)      |
| Иные ПД                                       | История заказов, реферальные данные, IP-хеш         |
| Сведения, собираемые метрическими программами | Если есть аналитика (Я.Метрика, Umami)              |

**Не отмечать** то, что не собирается: СНИЛС, ИНН, паспорт, доходы, здоровье, реквизиты карты (их обрабатывает эквайер).

### Блокер для публичного запуска

Регистрация в РКН — обязательный блокер **до публичного запуска**. Без неё нельзя открывать сайт для пользователей и индексацию поисковиков.

---

## 2. Cookie-баннер

### Требования

- **Функциональные cookie** (корзина, сессия) — не требуют согласия, включены всегда
- **Аналитика и маркетинг** — только opt-in (по умолчанию **выключены**)
- **Отзыв согласия** должен быть так же прост, как его предоставление — обязательна кнопка в футере
- Согласие логируется в БД (`ConsentLog`)

### Эталонная реализация

```
apps/aboi/src/app/[locale]/_components/cookie-consent.tsx    # Баннер с гранулярными чекбоксами
apps/aboi/src/app/[locale]/_components/cookie-settings-button.tsx  # Кнопка в футере
apps/aboi/src/app/api/consent/route.ts                        # Лог в БД
```

### Структура баннера

```
┌─────────────────────────────────────────────────────────┐
│ Мы используем cookie. Подробнее в политике ПДн.          │
│                                                          │
│ ☑ Необходимые (корзина, сессия)   [disabled, всегда вкл] │
│ ☐ Аналитика (Я.Метрика)           [opt-in]               │
│ ☐ Маркетинг (ретаргетинг)         [opt-in]               │
│                                                          │
│                    [Сохранить выбор] [Принять все]        │
└─────────────────────────────────────────────────────────┘
```

### Хранение согласия

```typescript
const STORAGE_KEY = 'aboi.consent.v1' // localStorage
// + отправка POST /api/consent → таблица ConsentLog в БД
```

### Повторное открытие из футера

```typescript
// cookie-settings-button.tsx
window.dispatchEvent(new Event('aboi:open-cookie-settings'))

// cookie-consent.tsx слушает это событие и показывает баннер снова
```

---

## 3. Чекбоксы согласия в формах

### Правило: где нужны

| Форма               | Нужен чекбокс? | Примечание                                    |
| ------------------- | -------------- | --------------------------------------------- |
| Регистрация         | ✅ Да          | Первый сбор ПД                                |
| Чекаут              | ✅ Да          | Новые ПД (адрес, телефон)                     |
| Покупка сертификата | ✅ Да          | Сбор ПД покупателя и получателя               |
| Настройки профиля   | ❌ Нет         | Пользователь уже дал согласие при регистрации |
| Адреса в ЛК         | ❌ Нет         | То же самое                                   |
| Вход (sign-in)      | ❌ Нет         | Не собираем новые данные                      |

### Критичные правила

1. **Никогда не предотмечать** — `consentAccepted: false` по умолчанию
2. **Лейбл со ссылками** — «офертой» и «политикой ПДн» должны быть кликабельными ссылками
3. **`target="_blank"`** — ссылки открываются в новой вкладке, форма не теряется
4. **Валидация** — `z.boolean().refine((v) => v === true, { message: 'Необходимо согласие' })`

### Паттерн для формы регистрации (нативный Chakra Checkbox)

```tsx
const [consentAccepted, setConsentAccepted] = useState(false)

// В handleSubmit:
if (!consentAccepted) {
  setError('Необходимо согласие с политикой обработки персональных данных')
  return
} // JSX:

<Checkbox.Root
  checked={consentAccepted}
  onCheckedChange={(e) => setConsentAccepted(!!e.checked)}
  colorPalette="brand"
  size="sm"
>
  <Checkbox.HiddenInput />
  <Checkbox.Control />
  <Checkbox.Label>
    <Text as="span" fontSize="sm">
      Согласен с{' '}
      <Box
        as="a"
        href="/privacy"
        target="_blank"
        rel="noopener noreferrer"
        color="brand.solid"
        _hover={{ textDecoration: 'underline' }}
      >
        политикой обработки персональных данных
      </Box>
    </Text>
  </Checkbox.Label>
</Checkbox.Root>
```

### Паттерн для AboiForm (через label: ReactNode)

```tsx
// label принимает ReactNode — вставляем ссылки прямо в лейбл
<AboiForm.Field.Checkbox
  name="consentAccepted"
  label={
    <>
      {'Согласен с '}
      <a href="/offer" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
        офертой
      </a>
      {' и '}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>
        политикой обработки персональных данных
      </a>
    </>
  }
/>
```

### Zod-схема

```typescript
// ✅ Правильно — начинает с false, требует true для отправки
consentAccepted: z.boolean().refine((v) => v === true, {
  message: 'Необходимо согласие с офертой',
}),

// defaultValues:
consentAccepted: false,   // ← НЕ true!

// ❌ Неправильно — литерал true не позволяет использовать false как дефолт
consentAccepted: z.literal(true, { message: '...' }),
consentAccepted: true as const,  // предотмечен — нарушение 152-ФЗ
```

---

## 4. Политика обработки ПДн (страница /privacy)

Обязательные разделы:

1. Кто оператор (ФИО ИП / наименование ЮЛ, ИНН)
2. Какие данные собираются и зачем
3. Срок хранения
4. Меры защиты
5. Права субъекта (152-ФЗ ст. 14-17): получить, исправить, удалить, отозвать согласие
6. Контакт для запросов (email `privacy@<domain>`)

**Дисклеймер в футере** (обязателен для медицинских/псевдомедицинских тематик):

> «[Продукт] — декоративный продукт. Не является медицинским изделием.»

Эталон: `apps/aboi/src/app/[locale]/(shop)/privacy/page.tsx`

---

## 5. Аналитика и сторонние скрипты — инициализация только после согласия

Аналитические скрипты (Яндекс.Метрика, Umami, GTM) **нельзя загружать до получения согласия** пользователя — они передают данные третьей стороне и попадают под ст. 6 ФЗ-152 (согласие субъекта).

### Особо чувствительный функционал

Яндекс.Метрика с включённым **webvisor** записывает видеосессии пользователей (движения мыши, клики, скролл). Это однозначно персональные данные. Не инициализировать до `analytics: true` в согласии.

### Библиотека `@letar/yandex-metrika`

Компонент поддерживает проп `hasConsent`:

```tsx
// undefined — инициализировать сразу (обратная совместимость)
// false     — не инициализировать (ждём согласия)
// true      — инициализировать

<YandexMetrika YM_COUNTER_ID={86731395} hasConsent={hasConsent} />
```

### Паттерн: consent-aware обёртка (эталон — dsperevod)

```
apps/dsperevod/src/app/_components/yandex-metrika-consent.tsx
```

```tsx
'use client'

import { CONSENT_STORAGE_KEY, type CookieConsentState } from '@/lib/consent'
import { YandexMetrika } from '@letar/yandex-metrika'
import { useEffect, useState } from 'react'

function readAnalyticsConsent(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return false
    return (JSON.parse(raw) as CookieConsentState).analytics === true
  } catch {
    return false
  }
}

export function YandexMetrikaConsent({ counterId }: { counterId: number }) {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    setHasConsent(readAnalyticsConsent())

    function onConsentChange(e: Event) {
      const state = (e as CustomEvent<CookieConsentState>).detail
      setHasConsent(state.analytics === true)
    }

    window.addEventListener('dsperevod:consent-change', onConsentChange)
    return () => window.removeEventListener('dsperevod:consent-change', onConsentChange)
  }, [])

  return <YandexMetrika YM_COUNTER_ID={counterId} hasConsent={hasConsent} />
}
```

Компонент:

- При монтировании читает `localStorage` (пользователь мог дать согласие в прошлый визит)
- Подписывается на кастомное событие `<app>:consent-change`, которое диспатчит `CookieBanner` при сохранении выбора
- Передаёт актуальный `hasConsent` в `YandexMetrika` — счётчик инициализируется реактивно

### Подключение в layout.tsx

```tsx
// layout.tsx
<YandexMetrikaConsent counterId={Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID) || 0} />
```

```env
# .env.docker
NEXT_PUBLIC_YM_COUNTER_ID=86731395
```

### Umami

`UmamiScript` из `@letar/analytics` возвращает `null` если `NEXT_PUBLIC_UMAMI_WEBSITE_ID` не задан — для деинициализации достаточно очистить переменную или скрыть компонент аналогичным паттерном.

---

## 6. Таблица ConsentLog в схеме БД

```zmodel
model ConsentLog {
  id                  String   @id @default(cuid())
  anonymousId         String?
  userId              String?
  ipHash              String
  userAgent           String?
  acceptedAnalytics   Boolean
  acceptedMarketing   Boolean
  acceptedFunctional  Boolean
  consentVersion      String
  consentedAt         DateTime @default(now())

  @@allow('create', true)
  @@allow('read', auth() != null && auth().role == 'ADMIN')
}
```

---

## 7. Чеклист при создании нового приложения, собирающего ПД

- [ ] Сервер находится в России (ст. 18 ч. 5 ФЗ-152)
- [ ] Страница `/privacy` с политикой обработки ПДн
- [ ] Дисклеймер в футере
- [ ] Cookie-баннер с opt-in для аналитики/маркетинга
- [ ] Кнопка «Настройки cookie» в футере
- [ ] Таблица `ConsentLog` + `/api/consent` эндпоинт
- [ ] Чекбокс согласия в форме регистрации (не предотмечен)
- [ ] Чекбокс согласия в формах сбора ПД (чекаут и т.п.) с кликабельными ссылками
- [ ] Право на удаление аккаунта в ЛК (`deleteAccountAction`)
- [ ] Аналитика (Яндекс.Метрика, Umami) инициализируется **только после** `analytics: true` в согласии — использовать consent-aware обёртку (эталон: `YandexMetrikaConsent` в dsperevod)
- [ ] **Подача уведомления в РКН** (блокер публичного запуска)
- [ ] Добавить номер оператора РКН в README/PLAN приложения после подачи
