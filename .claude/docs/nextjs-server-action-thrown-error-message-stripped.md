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

Пилот — приватное приложение монорепо (`src/lib/action-result.ts`,
`src/lib/use-action-form-errors.ts`). Кандидат на вынос в `libs/forms` (сейчас формат
`{ error }` без `success: false` парсером ActionResult в `forms-core` не распознаётся — поэтому
клиент бросает `ActionFailureError` сам).

## Как проверить, что дыр не осталось

Grep по `throw new Error(` с кириллицей в `'use server'`-файлах и в вызываемых из них
`assert*`, плюс список `create*/update*` над моделями с `@unique`/`@@unique`, не обёрнутых в
`catchActionFailure`. Живая проверка — только на production-сборке (`next build && next start`):
в `next dev` дефект не воспроизводится.

Актуальная точка входа по симптому: «Minified React error 441» / «Не удалось связаться с
сервером» при сохранении формы.
