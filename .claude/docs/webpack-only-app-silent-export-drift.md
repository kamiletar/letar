# ⚠️ auth-hub собирается webpack'ом, а не Turbopack — расхождения тихие, видны только в логе

**Кратко:** `auth-hub` — единственное приложение монорепо с `next build --webpack`
(`apps/auth-hub/project.json` переопределяет команду). Всё остальное собирается Turbopack.
Из-за этого код, безупречный во всех остальных приложениях, может вести себя иначе в Ключнице —
и не падением сборки, а предупреждением в логе плюс `undefined` в рантайме.

## Подтверждённый случай (2026-08-28)

`libs/forms/src/lib/context.tsx` экспортировал четыре значения одной деструктуризацией:

```ts
export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts()
```

Сборка auth-hub давала четыре предупреждения:

```
export 'fieldContext' (reexported as 'fieldContext') was not found in './lib/context'
(possible exports: useTypedFormContext, useTypedFormSubscribe)
```

То есть webpack считал, что модуль экспортирует только два function-объявления, а четыре
`const` — нет. Под webpack эти значения в рантайме приезжали бы `undefined`.

**Сборка при этом проходит.** `exit=0`, все 29 маршрутов собираются. Дефект существует только
в тексте лога — ни typecheck, ни lint, ни статус выхода его не показывают.

Фикс — разложить на отдельные экспорты через промежуточную константу. Проверено в обе стороны:
деструктуризация — 4 предупреждения, отдельные экспорты — ноль.

## ⚠️ Чего НЕ надо делать с этой находкой

Не переписывать все деструктурирующие экспорты в репозитории. Обобщение «webpack не разбирает
деструктуризацию» **неверно** — тот же паттерн в `libs/forms/src/lib/form-hook.ts`
(`export const { useAppForm, withForm } = createFormHook(...)`) и в
`libs/forms/src/lib/declarative/form-fields/base/primitives.ts` реэкспортируется из `index.ts`
точно так же и предупреждений не даёт.

Единственное найденное отличие проблемного файла — расширение `.tsx` вместо `.ts`. Причинная
связь **не подтверждена**. Поэтому правило звучит не «избегай деструктуризации», а
«читай лог сборки auth-hub».

## Второй класс ошибки: этот лог дважды прочитали неверно

Предупреждения `was not found` дважды принимали за причину падения сборки auth-hub
(отчёт от 2026-08-25). Сборка не падала. Проверять надо статус выхода, а не наличие
`not found` в выводе:

```bash
cd apps/auth-hub
AUTH_ENCRYPTION_KEY=$(openssl rand -hex 32) ../../node_modules/.bin/next build --webpack
echo "exit=$?"
```

Временный `AUTH_ENCRYPTION_KEY` нужен потому, что `/api/auth/dev-session` бросает на этапе
сборки без него — это тоже легко принять за поломку кода, хотя это отсутствующая переменная
окружения локальной машины.

## Что делать при работе с libs/, которые использует auth-hub

Правя общую библиотеку (`@letar/forms`, `@letar/ui`, `@letar/auth`), помни, что typecheck и
сборка остальных приложений на Turbopack ничего не скажут про webpack-путь. Если правка
касается формы экспортов, реэкспортов или границ клиент/сервер — прогони сборку auth-hub
и **прочитай лог**, а не только код возврата.

## Связанное

- [nextjs-dynamic-ssr-false-still-server-compiled](/.claude/docs/nextjs-dynamic-ssr-false-still-server-compiled.md) —
  другой случай, где резолв импортов расходится с ожиданием
- [verification-pitfalls](/.claude/docs/verification-pitfalls.md) — проверки, которые врут
  в успокаивающую сторону
