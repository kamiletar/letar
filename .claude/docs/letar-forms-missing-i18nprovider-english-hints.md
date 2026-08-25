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

## Найдено и исправлено (2026-08-25)

Полный список приложений со своим form-инстансом (грепом `from '@letar/forms'` по
`**/*-form.tsx`): `studio`, `aboi`, `driving-school`, `auth-hub`, `archetest`, `svoichuzhie`,
`dsperevod`, `mandala`, `kami`, `grandslamcup`, `animatrona` (renderer),
`form-develop-app`, `domwellbes`.

Уже было подключено на момент аудита (без бага) — `driving-school`, `archetest`, `mandala`
(через `form-i18n-wrapper.tsx`), `form-develop-app`, `dashboard`, `animatrona-tracker`.

Остальные восемь были без обёртки — исправлены по одному коммиту на приложение (плюс отдельный
коммит бампа submodule-указателя там, где приложение — приватный submodule):

| Приложение              | next-intl                               | Где подключено                                                                                                                                                                                            |
| ----------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domwellbes`            | нет                                     | `providers.tsx`, `locale="ru"` (первая находка, commit `3da69ba` в submodule)                                                                                                                             |
| `studio`                | да (ru/en/ja)                           | два дерева провайдеров: `providers.tsx` (бэк-офис, `locale="ru"`, не под next-intl) + новый `(public)/_components/form-i18n-wrapper.tsx` внутри `NextIntlClientProvider` (публичная часть, `useLocale()`) |
| `aboi`                  | да                                      | `providers.tsx`, уже был внутри `NextIntlClientProvider` — `useLocale()`                                                                                                                                  |
| `auth-hub`              | нет                                     | корневой `layout.tsx` (Server Component), `locale="ru"`                                                                                                                                                   |
| `svoichuzhie`           | нет                                     | `providers.tsx`, `locale="ru"`                                                                                                                                                                            |
| `dsperevod`             | нет                                     | `providers.tsx`, `locale="ru"`                                                                                                                                                                            |
| `kami`                  | да                                      | новый `_components/form-i18n-wrapper.tsx` внутри `NextIntlClientProvider` (`ThemeProvider` смонтирован снаружи, `useLocale()` там недоступен) — `useLocale()`                                             |
| `grandslamcup`          | нет                                     | `providers.tsx`, `locale="ru"`                                                                                                                                                                            |
| `animatrona` (renderer) | нет (Electron, i18next не используется) | `renderer/src/components/ui/provider.tsx`, `locale="ru"`                                                                                                                                                  |

**Правило выбора обёртки:** приложение на `next-intl` — `useLocale()`, без хардкода (форма
должна следовать текущей локали интерфейса). Приложение без `next-intl` (обычно
`<html lang="ru">` захардкожен) — прямой `locale="ru"`. Если у приложения несколько независимых
деревьев провайдеров (как у `studio` — бэк-офис отдельно от публичной части), в каждое дерево
нужна своя обёртка, и правило для неё определяется тем, есть ли в конкретном дереве
`NextIntlClientProvider`-предок, а не приложением в целом.
