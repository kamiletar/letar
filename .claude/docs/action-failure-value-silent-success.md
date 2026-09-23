# `ActionFailure` — отказ значением, который тихо считается успехом без `unwrap`

⚠️ Ловушка, которая выглядит как успех: UI показывает «удалено»/«сохранено», хотя Server Action
реально отказал — код зелёный, `try/catch` не сработал (отказу неоткуда взяться — исключения не
было), ошибка не в логах и не в GlitchTip.

## Механизм

`catchActionFailure` (`libs/forms-core/src/lib/server-errors/action-failure.ts`) — сознательный
паттерн: в production Next.js стирает текст любой ошибки, **брошенной** из Server Action (см.
[nextjs-server-action-thrown-error-message-stripped](/.claude/docs/nextjs-server-action-thrown-error-message-stripped.md)).
Поэтому ожидаемый отказ (`UserFacingError`, нарушение unique/FK) `catchActionFailure` ловит и
**возвращает значением** — `ActionFailure = { success: false, error, field? }` — вместо повторного
`throw`.

Отсюда ловушка: это значение успешного `resolve` промиса, не `reject`. Любой код, который просто
делает `await action()` и по факту завершения `await` (без исключения) считает операцию успешной —
**не заметит отказ вообще**. `try { await action() } catch { … }` тоже не поможет: исключения нет,
блок `catch` не вызывается.

## Правило

У любого клиентского хука/хелпера, вызывающего Server Action, обёрнутый в `catchActionFailure`,
**до** любой логики «успех делает X» (убрать элемент из списка, показать тост успеха, закоммитить
отложенное действие) должна стоять одна из двух проверок из `@letar/forms-core/server-errors`
(реэкспорт — `@letar/forms/server-errors`):

- `unwrapActionResult(await action())` — превращает `ActionFailure` обратно в исключение
  (`ActionFailureError`), дальше работает обычный `catch`;
- `isActionFailure(result)` — если код и так уже внутри `try/catch` и нужно просто различить
  «бизнес-ошибка» и «результат», не бросая повторно.

Голый `await action()` без одной из этих двух проверок — сигнал для код-ревью, не стиль. Проверить
это нельзя ни typecheck'ом (`Promise<T | ActionFailure>` резолвится нормально, тип не требует
разбора), ни обычным прогоном в dev (визуально форма «сохранилась» и там, и там) — только чтением
кода вызывающей стороны.

## Где встретилось (сессия 2026-09-23)

Аудит 33 delete-экшенов `apps/domwellbes` (приватный submodule, разбор — его
`PLAN_CROSSCUTTING.md` § «Тот же класс бага шире») нашёл три независимых публичных места без
проверки:

- [libs/admin-ui/src/hooks/use-inline-crud-list.ts](/libs/admin-ui/src/hooks/use-inline-crud-list.ts) —
  `handleDelete` убирал элемент из локального списка сразу после `await onDelete(id)`, не глядя на
  результат. Фикс — `unwrapActionResult(await onDelete(id))` (a5f7961ba).
- [libs/admin-ui/src/hooks/use-action-with-toast.ts](/libs/admin-ui/src/hooks/use-action-with-toast.ts) —
  `run()` показывал тост с ошибкой, только если её нашёл переданный `getError`, а под FK-обёрнутые
  actions его никто не задавал. Фикс — `isActionFailure(result) ? result.error : getError?.(result)`
  (a5f7961ba).
- [libs/undo-toast/src/client/use-delete-with-undo-redirect.ts](/libs/undo-toast/src/client/use-delete-with-undo-redirect.ts) —
  самый опасный случай: `onCommit` в отложенном/оптимистичном сценарии
  (`triggerDeferredUndoableAction`) делал голый `await deleteAction(id)`. UI уже показал запись
  удалённой (редирект на список произошёл сразу по клику, до коммита) — отказ значением закоммитился
  бы молча как успех, без единого следа для пользователя или в логах. Фикс —
  `unwrapActionResult(await deleteAction(id))` (8932e694f).

Все три — не одна опечатка, а один и тот же пробел, повторённый в трёх местах независимо: признак
того, что стоит проверять именно эту точку при ревью нового кода, а не полагаться на то, что она
«очевидна».

## Как проверить, что дыр не осталось

Grep по вызовам Server Action, обёрнутых `catchActionFailure` (в частности `on(Create|Update|Delete)`
пропсы `use-inline-crud-list.ts`-подобных хуков, `onCommit`/`deleteAction` у `undo-toast`), и
глазами — стоит ли перед use-сайтом веткой успеха `unwrapActionResult`/`isActionFailure`. Живой
симптом — не ошибка сборки или консоли, а несовпадение UI и реального состояния: элемент пропал со
страницы (или тост «готово»), а в БД запись осталась (FK-нарушение) или не изменилась.
