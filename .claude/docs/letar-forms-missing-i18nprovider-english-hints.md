# Без `FormI18nProvider` подсказки валидации молчаливо остаются на английском

## Симптом

Приложение русскоязычное, формы собраны на `@letar/forms`, схема поля объявлена как
`z.string().min(2)`/`.max(...)`. До ввода значения под полем показывается подсказка вида
`Minimum 2 characters` вместо ожидаемого `Минимум 2 символа` — при том, что RU-локализация в
`@letar/forms` уже реализована и работает в других местах того же приложения (например, ошибки
после сабмита переведены).

Ни typecheck, ни lint, ни рендер без ошибок в консоли это не ловят — страница выглядит рабочей.

## Причина

Constraint hints (`generateConstraintHint()`,
[libs/forms-core/src/lib/schema/constraint-hints.ts](/libs/forms-core/src/lib/schema/constraint-hints.ts))
берут текущую локаль из React-контекста, который выставляет
[`FormI18nProvider`](/libs/forms-react/src/lib/i18n/form-i18n-provider.tsx) (реэкспорт из
`@letar/forms`). Если дерево компонентов нигде не обёрнуто в `<FormI18nProvider locale="ru">`
(или в вариант с `next-intl`), локаль по умолчанию — `'en'`, и подсказки уходят в
`RU_TRANSLATIONS`-словарь никогда не попадая — используется английский словарь по умолчанию.

Библиотека это не форсирует и не предупреждает: `FormI18nProvider` — опциональная обёртка, её
отсутствие не ошибка конфигурации с точки зрения `@letar/forms`, а обычный (просто нежелательный
для русскоязычного продукта) дефолт.

## Фикс

Для приложения без next-intl — обернуть корневой client-компонент (`providers.tsx` или
аналогичный), рядом с остальными провайдерами (Chakra `Provider`, TanStack Query и т.п.):

```tsx
import { FormI18nProvider } from '@letar/forms'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ChakraProvider>
      <FormI18nProvider locale="ru">{children}</FormI18nProvider>
    </ChakraProvider>
  )
}
```

Для приложения на next-intl — не хардкодить `"ru"`, а прокидывать текущую локаль интерфейса
(пример в JSDoc `form-i18n-provider.tsx`):

```tsx
import { FormI18nProvider } from '@letar/forms'
import { useLocale } from 'next-intl'

function FormI18n({ children }: { children: ReactNode }) {
  const locale = useLocale()
  return <FormI18nProvider locale={locale}>{children}</FormI18nProvider>
}
```

## Найдено и исправлено

- **domwellbes** (2026-08-25, commit `3da69ba` в submodule) — `LeadRequestForm` на главной
  показывала английские подсказки; фикс — `FormI18nProvider locale="ru"` в
  `apps/domwellbes/src/app/_components/providers.tsx`.

## Уже было подключено (без бага)

`driving-school`, `archetest`, `mandala` (через `form-i18n-wrapper.tsx`), `form-develop-app`,
`dashboard`, `animatrona-tracker` — во всех есть `FormI18nProvider` где-то в дереве провайдеров.

## Статус аудита остальных приложений со своим `createForm()`

Полный список приложений со своим form-инстансом (грепом `from '@letar/forms'` по
`**/*-form.tsx`): `studio`, `aboi`, `driving-school`, `auth-hub`, `archetest`, `svoichuzhie`,
`dsperevod`, `mandala`, `kami`, `grandslamcup`, `animatrona` (renderer),
`form-develop-app`, `domwellbes`.

На 2026-08-25 подтверждено грепом (`FormI18nProvider` не встречается вообще ни в одном файле
приложения) — обёртки нет: `studio`, `aboi`, `auth-hub`, `svoichuzhie`, `dsperevod`, `kami`,
`grandslamcup`, `animatrona` (renderer). Визуальная проверка в браузере (шаг, подтверждающий, что
баг реально проявляется, а не просто отсутствует обёртка без последствий) и фикс каждого — в
процессе, по одному приложению за коммит (см. `.claude/rules/git.md` про 1 scope = 1 коммит).

`studio` и `aboi` используют `next-intl` — для них обёртка должна получать локаль через
`useLocale()`, не хардкодить `"ru"`. Остальные (`auth-hub`, `svoichuzhie`, `dsperevod`, `kami`,
`grandslamcup`) — `next-intl` не найден, `<html lang="ru">` захардкожен — обёртка с
`locale="ru"` без параметризации. `animatrona` (renderer) — Electron, не Next.js, использовать
паттерн из `i18n-multilingual` skill для проверки текущего фреймворка локализации перед фиксом.
