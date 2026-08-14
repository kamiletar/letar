# Цели форм в Яндекс.Метрике и Umami

## Зачем

Без целей в Яндекс.Метрике реклама в Директе не считает конверсии — оптимизация по кликам вместо
заявок сжигает бюджет впустую. Библиотека `@letar/forms` уже несёт готовую инфраструктуру для
этого — хук `useFormAnalytics` и адаптеры `createUmamiAdapter`/`createYandexMetrikaAdapter`/
`createGtagAdapter`/`createPostHogAdapter` (`libs/forms-core/src/lib/analytics/`,
`libs/forms/src/lib/analytics/`) — но до 2026-08-12 она использовалась только в демо
(`apps/form-docs`, `apps/form-example`), ни в одном прод-приложении подключена не была.

Первое реальное подключение — в одном из приватных submodule-приложений.

## Минимальный пример подключения

```tsx
'use client'

import { createUmamiAdapter, createYandexMetrikaAdapter, useFormAnalytics } from '@letar/forms'

const YM_COUNTER_ID = Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID) || undefined

export function MyForm() {
  const analytics = useFormAnalytics({
    formId: 'lead-request', // уникально в пределах приложения — попадёт в имя цели
    adapters: [createUmamiAdapter(), ...(YM_COUNTER_ID ? [createYandexMetrikaAdapter(YM_COUNTER_ID)] : [])],
  })

  async function handleSubmit(data) {
    const result = await submitAction(data)
    if (!result.error) {
      analytics.trackComplete() // ym(counterId, 'reachGoal', 'form_lead-request_complete') + Umami-событие
    }
  }

  // ...
}
```

`useFormAnalytics` дополнительно сам трекает focus/blur/error/abandon через глобальные
document-листенеры — привязывать обработчики к каждому полю формы не нужно, `trackComplete()`
достаточно вызвать вручную в момент успешного сабмита.

Если адаптеров у нескольких форм приложения много — вынеси создание списка в общий хелпер
(`src/lib/form-analytics.ts` в приложении), чтобы не дублировать `YM_COUNTER_ID` и список
адаптеров в каждом компоненте формы.

## Нюанс: адаптеры no-op без загруженных скриптов — и поэтому consent-aware бесплатно

Адаптеры читают глобальные `window.umami`/`window.ym`. Эти объекты появляются только после того,
как загрузились сами скрипты аналитики (`UmamiScript` из `@letar/analytics`, `YandexMetrika` из
`@letar/yandex-metrika`). Если скрипты обёрнуты в `AnalyticsGate` из `@letar/ui`
(в `layout.tsx` приложения):

```tsx
<AnalyticsGate appKey="<app>">
  <UmamiScript />
  <YandexMetrika YM_COUNTER_ID={Number(process.env.NEXT_PUBLIC_YM_COUNTER_ID)} />
</AnalyticsGate>
```

— то до согласия на cookie `window.umami`/`window.ym` не существуют, и вызов `trackComplete()`
(как и автотрекинг focus/blur/error/abandon) просто ничего не отправляет — без ошибок, без
проверок на стороне вызывающего кода. Это не специальная логика на стороне `@letar/forms`, а
побочный эффект того, что адаптеры не хранят собственное состояние готовности — они каждый раз
проверяют `window.umami`/`window.ym` напрямую.

## Именование целей в Яндекс.Метрике

Код всегда шлёт `reachGoal` с идентификатором `form_<formId>_complete` — где `formId` берётся из
опции `useFormAnalytics({ formId })` дословно. Саму цель нужно завести в интерфейсе Яндекс.Метрики
руками: **Цели → Добавить цель → тип «JS-событие»**, идентификатор — тот же `form_<formId>_complete`.
Без этого шага событие в Метрику долетает (его видно в вебвизоре/логах счётчика), но конверсия
нигде не считается, а Директ его не увидит.
