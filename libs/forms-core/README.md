# @letar/forms-core

Framework-free ядро [`@letar/forms`](../forms/README.md) — Zod-мета-движок, валидаторы, i18n,
серверные ошибки, security-утилиты и другая логика форм, которая не зависит ни от React, ни от
Chakra, ни от какого-либо другого UI-фреймворка.

## Архитектурный принцип

Clean Architecture / DIP: `@letar/forms` (React-адаптер) зависит от `forms-core`, а не наоборот.
Ядро — не «то, что осталось после вырезания Chakra», а первый класс архитектуры: чистые TS-функции
вместо React-хуков там, где это возможно, без единого runtime-импорта фреймворка.

Граница держится на двух независимых механизмах, оба проверены негативной пробой (временный импорт
`Box` из Chakra в исходник `forms-core` валит `nx lint forms-core`):

- ESLint `depConstraints` для тега `type:core` (`project.json`);
- `no-restricted-imports` на `**/forms-core/src/**/*.ts` против `react`, `@chakra-ui/*`,
  `@tanstack/react-*` (корневой `eslint.config.mjs`).

«Framework-free» ≠ «platform-free» — DOM API (`Image`, `document`, `canvas` в `security/`) и
динамические `import()` npm-пакетов (`idb-keyval` в `offline/`) не тянут React/Chakra, но требуют
своего рантайм-окружения в тестах (`fake-indexeddb/auto`, localStorage-полифилл в
`vitest.setup.ts`). Проверяется только реальным тестовым прогоном — само по себе успешное
`typecheck` полноту миграции окружения не подтверждает.

## Subpath-экспорты

| Subpath                           | Что внутри                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `@letar/forms-core`               | Точка входа по умолчанию (реэкспорт основных типов)                            |
| `@letar/forms-core/validators/ru` | Валидаторы для РФ-специфичных форматов (ИНН, КПП, СНИЛС и т.д.)                |
| `@letar/forms-core/schema`        | Zod-мета-движок: constraints, traversal, `withUIMeta`, типы meta               |
| `@letar/forms-core/server-errors` | Маппинг серверных ошибок (Prisma/ZenStack/Zod) на поля формы                   |
| `@letar/forms-core/utils`         | `deepEqual`, `safeStringify`                                                   |
| `@letar/forms-core/security`      | Проверка файлов при загрузке (MIME, EXIF-стрип и т.д.) — использует DOM API    |
| `@letar/forms-core/offline`       | Offline-сервис синхронизации (`idb-keyval` под капотом)                        |
| `@letar/forms-core/captcha`       | Серверная верификация CAPTCHA (Turnstile/reCAPTCHA/hCaptcha/SmartCaptcha)      |
| `@letar/forms-core/analytics`     | Адаптеры аналитики форм (Umami, Яндекс Метрика, GA4, PostHog)                  |
| `@letar/forms-core/credit-card`   | Luhn-валидация, определение бренда карты, форматирование срока действия/номера |
| `@letar/forms-core/phone`         | WebKit-safe форматтер телефона (замена `use-mask-input`, см. v1.4.4)           |
| `@letar/forms-core/table`         | Утилиты табличного редактора (агрегация, сортировка и т.д.)                    |
| `@letar/forms-core/address`       | DaData address provider (Chakra-free часть)                                    |
| `@letar/forms-core/i18n`          | `createFormErrorMap` — словари перевода ошибок валидации                       |
| `@letar/forms-core/uikit`         | Типовой контракт UIKit (~20 примитивов) — см. ниже                             |

## UIKit-контракт (Фаза 7.1, Этап 4)

`@letar/forms-core/uikit` — типы, описывающие, что полю нужно от UI-библиотеки (Chakra, shadcn,
...), без единой строки реализации. Адаптер (сегодня — `chakraUIKit` внутри `libs/forms`) даёт
конкретную реализацию; поле обращается к контракту, а не к Chakra напрямую.

```typescript
import type { UIKit } from '@letar/forms-core/uikit'

// В React-адаптере: конкретная реализация контракта
const chakraUIKit: UIKit<ReactNode> = {
  FieldRoot: (props) => <Field.Root {...props} />,
  Input: (props) => <Input {...props} />,
  // ...
}
```

Реализованы (`UIKitCorePrimitives`) и используются тремя полями (`Field.String`,
`Field.Checkbox`, `Field.Select`) — доказательство, что контракт достаточен и не протекает:

- `FieldRoot`, `FieldLabel`, `FieldError`
- `Input`, `Checkbox`, `Select`

Добавлены в Фазе 7.3 и реализованы Chakra-адаптером — их потребляет композиционный слой
(обёртка поля, error boundary, кнопки массивов), а не сами поля:

- `Tooltip`, `RequiredIndicator`, `ErrorFallback`
- `Button`, `IconButton` (с `type`/`variant`/`size`/`tone`)

Типизированы, но пока без реализации (`UIKitExtendedPrimitives`, `Partial` в составе `UIKit`) —
добавляются по мере миграции соответствующего поля, а не заранее:

- `NumberInput`, `NativeSelect`, `Combobox`, `RadioGroup`, `SegmentGroup`, `PinInput`
- Layout: `Box`, `HStack`, `VStack`, `Text`

Это осознанно неполное покрытие — цель Этапа 4 была доказать, что граница работает на
представительной выборке (текстовое/бинарное/выборное поле), а не переписать все 56 полей за раз.

### Контракт описывает намерение, а не оформление

Правило, выведенное из двух реальных протечек, найденных в Фазе 7.3:

- `FieldWrapper` подсвечивал поле во время async-валидации `css`-пропом с Chakra-токенами
  (`borderColor: 'blue.200'`) → стало состояние `validating?: boolean` у `FieldRoot`.
- Кнопка удаления элемента массива несла `colorPalette="red"` → стало `tone: 'danger'`
  (тип `UIKitTone`), которое Chakra-адаптер сам переводит в `colorPalette`, а shadcn перевёл бы
  в `variant="destructive"`.

Если в пропе примитива появляется название цвета, размера или токена конкретной UI-библиотеки —
граница уже протекла, даже когда типы сходятся.

### Группировка опций — протечка на уровне данных

`groupOptions` / `hasGroups` / `getOptionLabel` (тот же subpath `./uikit`) — чистая логика
группировки опций для `Select`/`Combobox`/`Listbox`. Вынесена из хука `useGroupedOptions`
(`libs/forms`), который смешивал её с построением `createListCollection` — рантайм-структуры
Ark UI.

Это другой класс протечки, чем импорт компонента: у shadcn нет `createListCollection` вовсе,
поэтому подменить её реализацией примитива нельзя — коллекцию строит адаптер, а ядро отдаёт
только сгруппированные данные.

## Команды

```bash
nx test forms-core
nx lint forms-core
nx typecheck:tsgo forms-core
```

## Подключение к приложению

`forms-core` — внутренняя зависимость `@letar/forms`, обычные приложения-потребители не
импортируют его напрямую (кроме отдельных subpath, если явно понадобится, например
`@letar/forms-core/validators/ru`). Механика резолва (workspace-зависимость + `paths` в
tsconfig потребителей) — [libs.md](/.claude/rules/libs.md#подключение-к-приложению).

⚠️ Новый subpath-экспорт требует зеркальной записи в `libs/forms/vitest.config.ts` —
generated из `forms-core/package.json` → `exports` автоматически, но проверь порядок ключей:
`rollup-plugin-alias` матчит объектные алиасы по префиксу, и бare `@letar/forms-core` (без
подпути) обязан сортироваться после всех подпутей.

## Связанные документы

- [/libs/forms/README.md](../forms/README.md) — React/Chakra-адаптер поверх этого ядра
- [/libs/forms/PLAN.md](../forms/PLAN.md) — Фаза 7 (стратегия дистрибуции, расслоение core)
