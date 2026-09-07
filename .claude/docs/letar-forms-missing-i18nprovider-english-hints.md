# Без `FormI18nProvider` подсказки валидации молчаливо остаются на английском

## Симптом

Приложение русскоязычное, формы собраны на `@letar/forms`, схема поля объявлена как
`z.string().min(2)`/`.max(...)`. До ввода значения под полем показывается подсказка вида
`Minimum 2 characters` вместо ожидаемого `Минимум 2 символа` — при том, что RU-локализация в
`@letar/forms` уже реализована и работает в других местах того же приложения (например, ошибки
после сабмита переведены).

Ни typecheck, ни lint, ни рендер без ошибок в консоли это не ловят — страница выглядит рабочей.

⚠️ **Это не то же самое, что английское сообщение ПОСЛЕ неудачного сабмита** (например
`Too small: expected string to have >=2 characters` вместо `Минимум 2 символов`, найдено на
`domwellbes` 2026-09-07). Это два независимых механизма — см. раздел «Второй, независимый
пробел» ниже.

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

## Root cause в генераторах — закрыт (2026-08-25)

Причина, по которой баг регулярно возвращался: шаблоны `Providers`-компонента у
`nx g @letar/generators:new-app` и `nx g @letar/generators:electron-app` не включали
`FormI18nProvider` вовсе — каждое новое приложение стартовало уже с этим пробелом.

Исправлено в обоих шаблонах — `<FormI18nProvider locale="ru">` обёрнут вокруг `children`,
`forms` добавлен в `implicitDependencies` их `package.json.template`
([libs/generators/src/generators/new-app/files/src/app/_components/providers.tsx.template](/libs/generators/src/generators/new-app/files/src/app/_components/providers.tsx.template),
[libs/generators/src/generators/electron-app/files/renderer/app/_components/providers.tsx.template](/libs/generators/src/generators/electron-app/files/renderer/app/_components/providers.tsx.template)).
Ни у одного из двух генераторов нет next-intl-варианта — там всегда хардкод `"ru"`, как у
приложений без next-intl в таблице выше. Приложение, добавляющее next-intl после генерации,
переключает обёртку на `useLocale()` вручную, тем же способом, что и `aboi`/`kami` в таблице.

## Второй, независимый пробел: сообщение ПОСЛЕ сабмита не переводилось вовсе (2026-09-07)

Найдено на `domwellbes` (`admin/houses/new`, поле «Название», `HouseSchema` —
`z.string().min(2)` без кастомного `.meta()`-сообщения): даже с уже подключённым
`<FormI18nProvider locale="ru">` реальное сообщение об ошибке, которое Zod кладёт в
`error.issues[0].message` после `safeParse`, оставалось англоязычным дефолтом Zod
(`Too small: expected string to have >=2 characters`).

**Это не регресс и не тот же баг, что выше** — constraint hints (`generateConstraintHint`,
раздел «Причина») и сообщение об ошибке после валидации — два независимых механизма с разными
словарями:

- Constraint hint — проактивная подсказка под полем ДО ввода/сабмита, берёт локаль из
  `FormI18nProvider` и всегда была переводима одним `locale="ru"` (её словарь —
  `RU_TRANSLATIONS`/`EN_TRANSLATIONS` в
  [constraint-hints.ts](/libs/forms-core/src/lib/schema/constraint-hints.ts), с корректной
  плюрализацией через `Intl.PluralRules`: «Минимум 2 символ**а**»).
- Сообщение ПОСЛЕ неудачной валидации — реальный `issue.message` от Zod v4, подменяется только
  установкой `z.config({ customError: errorMap })` внутри `FormI18nProvider` при
  `setupZodErrorMap={true}`. До фикса ниже это требовало ОБЯЗАТЕЛЬНОГО параметра `t`
  (`createFormErrorMap({ t })`, JSDoc в `form-i18n-provider.tsx`) — полноценной функции перевода
  вида `useTranslations()` из next-intl с собственным JSON-словарём по ключам
  `validation.{code}.{origin?}`. Приложение без next-intl (как `domwellbes`) физически не имело
  такой функции, поэтому `setupZodErrorMap` было бессмысленно включать — итоговое сообщение
  «Минимум 2 символ**ов**» (обратите внимание на другую форму слова — это НЕ constraint hint,
  а именно ошибка после сабмита) оставалось на дефолте Zod.

**Фикс (v4.1.0, `@letar/forms-core`+`@letar/forms-react`):** встроенный ru/en словарь для
`validation.{code}.{origin?}` —
[builtin-error-translations.ts](/libs/forms-core/src/lib/i18n/builtin-error-translations.ts),
`createBuiltinTranslateFunction(locale)`. `FormI18nProvider` теперь строит error map из
`t` приложения (если задан) с откатом на встроенный словарь по `locale`, и включается флагом
`setupZodErrorMap` уже без обязательного `t` — работает «из коробки» и без next-intl.

**Вывод:** приложение с `<FormI18nProvider locale="ru">` без `setupZodErrorMap` получает русские
constraint hints, но английские сообщения после сабмита — это ожидаемо для версий библиотеки до
v4.1.0, а не повторение бага из раздела выше. Чтобы получить перевод и там и там — добавить
`setupZodErrorMap` (пример — `apps/domwellbes/src/app/_components/providers.tsx`).
