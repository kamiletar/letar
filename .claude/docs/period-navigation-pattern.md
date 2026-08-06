# Навигация по периоду без клиентского JS

Паттерн для страниц, где владелец/клиент листает временной период (месяц, неделя, произвольный
диапазон) и видит серверные данные за этот период — без единого `useState` и без клиентского
JS-компонента выбора даты.

## Когда подходит

- Страница и так Server Component (данные читаются на сервере, SSR/RSC).
- Переключение периода — это по сути новая навигация: сменил период → сервер заново прочитал
  данные → отрендерил страницу. Полная перезагрузка контента (пусть и без hard-reload, Next.js
  делает soft-navigation по App Router) — ожидаемое поведение, не воспринимается как лишний шаг.
- Набор периодов конечный и предсказуемый (пресеты вроде «сегодня/неделя/месяц») или параметризован
  просто (`?period=YYYY-MM`, `?from=...&to=...`).

## Когда НЕ подходит

- Нужна **мгновенная** фильтрация без перезагрузки страницы (drag по графику, live-обновление при
  каждом клике на календаре без ухода с текущего скролла/фокуса) — это явный кейс клиентского
  компонента с `useState`/date-picker библиотекой.
- Период — это лишь один из многих одновременно меняющихся фильтров в сложной форме, где
  промежуточное состояние важно (несохранённый черновик фильтра) — тогда состояние логично держать
  на клиенте до момента применения.

## Три строительных блока

### 1. Чистые функции-резолверы диапазона

Никакого React, никакого запроса — только вычисление `{ start, end }` (полуоткрытый интервал,
`end` не включён) по входному параметру. Держать в `lib/`, тестировать юнит-тестами без сервера.

Важная деталь из студийной реализации: если приложение работает в одном фиксированном часовом
поясе (не поясе сервера), у диапазонных функций должен быть суффикс вроде `...StudioTz`, а сама
конвертация — через пару `parseStudioLocalDateTime`/`formatStudioLocalDateTime` в одном файле, а
не размазана по компонентам.

### 2. Server Component, управляемый `searchParams`

Страница — `async function Page({ searchParams })`, читает `searchParams` (в Next.js App Router
это `Promise`), решает какой пресет/период активен, зовёт резолвер, использует результат в
запросах к БД. Никакого клиентского стейта — вся правда о «какой период выбран» живёт в URL.

### 3. Обычные ссылки и нативная GET-форма для навигации

- Пресеты — `<a>`/`NextLink` на `?range=preset-name`, без `onClick`.
- Произвольный диапазон — `<form method="get">` с `<input type="date">` внутри и submit-кнопкой;
  браузер сам собирает query string и делает GET-переход. Никакого `onChange`-хендлера.

## Минимальный скелет

```tsx
// lib/period.ts — чистые функции, без React
export interface DateRange {
  start: Date
  end: Date
}

export function resolvePeriod(preset: string, now: Date): DateRange {
  // ...вычисление границ по пресету
}

// app/report/page.tsx — Server Component
interface PageProps {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}

export default async function ReportPage({ searchParams }: PageProps) {
  const { range, from, to } = await searchParams
  const period = from && to ? resolveCustomRange(from, to) : resolvePeriod(range ?? 'week', new Date())

  const data = await db.entry.findMany({ where: { date: { gte: period.start, lt: period.end } } })

  return (
    <div>
      <nav>
        <a href="?range=week">Неделя</a>
        <a href="?range=month">Месяц</a>
      </nav>
      <form method="get">
        <input type="date" name="from" />
        <input type="date" name="to" />
        <button type="submit">Показать</button>
      </form>
      {/* рендер data */}
    </div>
  )
}
```

## Референсные реализации в studio

- Месячная пагинация (`?period=YYYY-MM`, кнопки ← →):
  `apps/studio/src/app/(cabinet)/cabinet/time/page.tsx` + `shiftPeriod()`/`getCurrentPeriodStudioTz()`
  из `apps/studio/src/lib/time.ts`.
- Пресеты + произвольный диапазон (`?range=preset` или `?range=custom&from=...&to=...`):
  `apps/studio/src/app/(owner)/owner/time/page.tsx` +
  `apps/studio/src/app/(owner)/owner/time/_components/period-report.tsx`, резолверы —
  `resolveTimePeriodRangeStudioTz`, `getCustomRangeStudioTz`, `getLastWeekRangeStudioTz`,
  `formatDateStudioTz`, `formatRangeLabelRu`, `TIME_PERIOD_PRESETS`/`TIME_PERIOD_PRESET_LABELS` в
  `apps/studio/src/lib/time.ts`.
