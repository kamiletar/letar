# Server Action в production: текст брошенной ошибки стирается

⚠️ Ловушка, которая выглядит как рабочая форма: в `next dev` причина отказа видна, в production
клиент получает «Minified React error» (код 441) и общий текст вместо сообщения.

## Механизм

Next.js в production заменяет сообщение любой ошибки, **брошенной** из Server Action, на
обезличенное — чтобы не утекали внутренности сервера. Проверка `error.message` на клиенте
(`catch`, `mapServerErrors`, `middleware.onError`) видит уже стёртый текст. В `dev` стирания нет,
поэтому на этапе разработки всё выглядит рабочим.

Стирается не только собственный `throw new Error('…')`, но и **нарушение unique** из БД
(ORM-ошибка с `dbErrorCode = 23505`, SQLSTATE): форма, рассчитывавшая на
`mapServerErrors(error)` → «поле уже занято», в production тоже получает пустоту.

## Решение: отказ значением

Ожидаемый отказ (бизнес-правило, дубль) сервер **возвращает**, а форма на клиенте **бросает
заново** — клиентский `throw` не стирается:

```ts
// action ('use server')
return catchActionFailure(async () => db.x.create({ … }))      // → T | { error, field? }

// форма
unwrapActionResult(await createX(data))                        // бросает ActionFailureError
const { formRef, middleware } = useActionFormErrors()          // middleware.onError → поле/блок Errors
```

- `UserFacingError` — исключение с текстом для человека, бросается из lib-кода (`assert*`), а
  `catchActionFailure` превращает его в значение. Обычный `Error` так не превращается намеренно:
  его текст может быть техническим.
- `catchActionFailure` ловит только `UserFacingError` и unique; всё остальное пробрасывает — это
  настоящая неполадка, ей место в логах и GlitchTip.
- Авторизацию (`requireRole`) держи **вне** `catchActionFailure`.
- Форме нужен `<Form.Errors />`: без него отказ без привязки к полю нигде не виден.
- Формы, у которых нет `middleware.onError`, при брошенной ошибке не показывают вообще ничего
  (`throw` уходит в необработанный промис) — тот же симптом, что и стирание текста.

## Где реализовано

Вынесено в библиотеку форм (2026-09-21): `@letar/forms-core/server-errors` 0.13.0 (`actionFailure`,
`unwrapActionResult`, `catchActionFailure`, `UserFacingError`, `ActionFailureError`, парсер в цепочке
`mapServerErrors`), `useFormServerAction.run` и `useActionFormErrors` в `@letar/forms-react` 0.10.0.
Server Action импортирует из `@letar/forms/server-errors` (подпуть без React). Разбор и границы —
[libs/forms/docs/server-errors.md](/libs/forms/docs/server-errors.md) §«Отказ Server Action значением».

Формат отказа в библиотеке — `{ success: false, error, field? }`: явный маркер `success: false`, иначе
успешный результат с полем `error` бросился бы как отказ. Пилот в приложении жил на `{ error }` без
маркера — при переходе на библиотеку значения отказов пересобираются фабрикой `actionFailure`.

⚠️ Поле из имени unique-ограничения выводится только для `<Table>_<field>_key` (три части):
составной ключ, `@@map("snake_case")` и `@map` неоднозначны — там общий текст, свой задаётся через
`uniqueMessages`.

## Как проверить, что дыр не осталось

Grep по `throw new Error(` с кириллицей в `'use server'`-файлах и в вызываемых из них
`assert*`, плюс список `create*/update*` над моделями с `@unique`/`@@unique`, не обёрнутых в
`catchActionFailure`. Живая проверка — только на production-сборке (`next build && next start`):
в `next dev` дефект не воспроизводится.

Актуальная точка входа по симптому: «Minified React error 441» / «Не удалось связаться с
сервером» при сохранении формы.
