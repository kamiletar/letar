# @letar/undo-toast

Разрушительное действие отменяемо ПОСЛЕ, а не подтверждаемо ДО — заповедь №20 студии
(`.claude/private/WEBSTUDIO.md`). Вместо диалога «Вы уверены?» запись убирается из UI сразу
(заповедь №15), а реальная мутация улетает на сервер без лишнего ожидания или откладывается на
время жизни тоста с кнопкой «Отменить» — в зависимости от того, есть ли у записи настоящее
восстановление.

Не трогает `@letar/ui` напрямую и не завязана на TanStack Query — принимает уже готовый
`toaster`-инстанс (из `createAppToaster()` в `@letar/ui`) и произвольные колбэки. Что внутри них —
реальный delete-запрос, оптимистичное обновление списка — решает вызывающая сторона.

⚠️ **Не для действий, необратимых за пределами системы** (списание платежа, отправленное
письмо, публикация вовне) — коммит может успеть уйти на сервер раньше клика «Отменить»,
подтверждение «до» остаётся правильным инструментом.

## Два паттерна — выбор зависит от того, есть ли restore на сервере

Библиотека экспортирует две функции, а не одну — они решают разные задачи и не взаимозаменяемы:

| Функция                         | Когда использовать                                                            | Commit                                                   |
| ------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| `triggerUndoableAction`         | у записи есть настоящий soft-delete + restore на сервере (`deletedAt`/аналог) | немедленно, по клику на действие                         |
| `triggerDeferredUndoableAction` | у записи только жёсткое удаление, восстановить после коммита нечем            | отложен до истечения окна тоста ИЛИ до ухода со страницы |

Не подменяй одно другим: `triggerUndoableAction` с колбэком `undo`, который ничего не умеет
восстановить (`onUndo: () => {}`), выглядит как рабочая кнопка «Отменить», хотя запись уже удалена
на сервере безвозвратно.

## Установка

```typescript
import { triggerDeferredUndoableAction, triggerUndoableAction } from '@letar/undo-toast'
import { useDeferredUndoableAction, useUndoableAction } from '@letar/undo-toast/client'
```

## API

### `triggerUndoableAction(toaster, options, vars)` — немедленный commit + реальная отмена

Показывает тост (`toaster.create`) с кнопкой `options.undoLabel` (дефолт «Отменить»), живущей
`options.durationMs` (дефолт 5000мс). `options.action(vars)` вызывается **сразу**, не дожидаясь
окна тоста — запись действительно удаляется/меняется на сервере в момент клика по кнопке
действия. Клик «Отменить» вызывает `options.undo(vars)`, который обязан быть настоящим обратным
действием (restore, а не просто визуальный возврат строки в список).

```typescript
triggerUndoableAction(
  toaster, // из createAppToaster() приложения
  {
    message: (item: { name: string }) => `Удалено: ${item.name}`,
    action: (item) => deleteHouse(item.id), // soft-delete: deletedAt = now()
    undo: (item) => restoreHouse(item.id), // deletedAt = null — настоящее восстановление
  },
  house,
)
```

Образец в проде — `apps/domwellbes/src/app/(admin)/admin/houses/_components/house-form.tsx`
(`deleteHouse`/`restoreHouse` — реальный `deletedAt`).

### `triggerDeferredUndoableAction(toaster, options, vars)` — отложенный commit + pagehide-safety

Тот же тост, тот же таймер, но `options.onCommit(vars)` откладывается: запись пропадает из UI по
клику сразу (оптимистично, самим вызывающим кодом — библиотека этим не занимается), а реальная
серверная мутация уходит **один раз**: либо по истечении `durationMs`, либо раньше, если страница
закрывается/перезагружается (`pagehide`/`beforeunload`, см. pagehide-safety ниже). Клик «Отменить»
отменяет запланированный `onCommit` и вызывает `options.onUndo(vars)` — `onCommit` в этом случае
на сервер вообще не уходит, откатывать нечего (в отличие от `triggerUndoableAction`, где отмена —
это отдельный обратный запрос).

Подходит только для записей без внешнего восстановления: хочешь удалить жёстко (нет `deletedAt`),
но не готов ждать реального delete-запроса на каждый клик.

```typescript
triggerDeferredUndoableAction(
  adminToaster,
  {
    message: 'Вакансия удалена',
    onCommit: () => deleteVacancy(id), // уходит на сервер только по истечении окна/pagehide
    onUndo: () => {}, // запись и так ещё жива в БД — на UI её вернул вызывающий код
    onError: () => adminToaster.create({ title: 'Не удалось удалить вакансию', type: 'error' }),
  },
  undefined,
)
```

Образец в проде — `apps/domwellbes/src/app/(admin)/admin/vacancies/_components/vacancy-form.tsx`
и ещё 10 файлов, переведённых с нативного `confirm(` 2026-09-23 (список — в
`apps/domwellbes/PLAN_CROSSCUTTING.md`, «Единообразие админки»).

### `useUndoableAction(toaster, options)` / `useDeferredUndoableAction(toaster, options)`

(`@letar/undo-toast/client`)

React-хуки — каждый возвращает мемоизированный `trigger(vars)` поверх одноимённой функции.
`options` не мемоизируется автоматически — при нестабильных колбэках оборачивай их `useCallback`
на стороне компонента.

### `useDeleteWithUndoRedirect(options)` — специализация под «форма записи → удалить → на список»

(`@letar/undo-toast/client`)

Все 9 «Отменяемых» удалений из аудита ниже — не просто вызов `triggerDeferredUndoableAction`, а
один и тот же более узкий сценарий: детальная форма CRUD-сущности, `router.push` на список СРАЗУ
по клику (до коммита — запись уже не видна там, куда вернётся клик «Отменить»), `onUndo` всегда
пустая функция (восстанавливать на UI нечего). Три параметра менялись от файла к файлу
(`redirectTo`, `message`+`errorTitle`, `deleteAction`), остальное — дословно одинаковый код,
включая id-guard и порядок «редирект раньше коммита». Извлечено сюда, а не оставлено вызовом
`triggerDeferredUndoableAction` в каждой форме — иначе следующая правка этого инварианта (как
`pagehide`-safety выше) снова расходится по N копиям.

```typescript
const handleDelete = useDeleteWithUndoRedirect({
  toaster: adminToaster,
  id, // undefined (новая запись) — handleDelete становится no-op
  redirectTo: '/admin/vacancies/',
  message: 'Вакансия удалена',
  errorTitle: 'Не удалось удалить вакансию',
  deleteAction: deleteVacancy, // (id: string) => Promise<unknown>
})
```

Не подходит сценарию без редиректа (список с удалением строки на месте, оптимистичным
исчезновением) — там `useDeferredUndoableAction` напрямую, редирект здесь не опция, а часть
контракта (см. `onUndo` выше).

## ⚠️ pagehide-safety — обязательная часть контракта `triggerDeferredUndoableAction`, не опция

Модель «отложенный commit только по таймеру» без сброса при уходе со страницы уже ломалась в
проде: `cart-item-row.tsx` откладывал удаление до истечения окна безо всякой подстраховки — если
пользователь закрывал вкладку или перезагружал страницу, пока шёл таймер, коммит не долетал
никогда, а пользователь был уверен, что удалил. Для корзины это безопасный исход (товар просто
остаётся), но для произвольного `onCommit` — нет: запись выглядит удалённой в закрытой вкладке и
внезапно снова появляется при следующем визите.

Поэтому `triggerDeferredUndoableAction` сама слушает `pagehide` и `beforeunload` и коммитит
принудительно, если один из них сработал раньше таймера. Оба слушателя нужны одновременно:
`pagehide` — основной сигнал ухода (переживает bfcache-навигацию, надёжнее в мобильном Safari),
`beforeunload` — подстраховка там, где `pagehide` не долетает. `triggerUndoableAction` этого
механизма не несёт вовсе — ему незачем, коммит там уже произошёл к моменту показа тоста.

**Требование к самому `onCommit`:** он обязан быть готов исполниться в unload-контексте.
Обычный `fetch`/Server Action браузер может оборвать вместе с выгрузкой страницы, не дождавшись
ответа — используй `fetch(url, { keepalive: true })` или `navigator.sendBeacon` внутри
`onCommit`, а не то, что годится только для обычного клика.

**Где отложенный commit не подходит вовсе** — записи с внешним каскадным эффектом, который
другие видят немедленно (см. `apps/domwellbes/PLAN_CROSSCUTTING.md`, «Единообразие админки»,
таблица аудита 2026-09-23): там нужен `TriggerConfirmDialog` из `@letar/ui`, а не этот хелпер.

## Статус (2026-09-23)

Контракт согласован с `ui-coordinator-dev` (владелец `@letar/ui`, куда этот хелпер целится по
`apps/domwellbes/PLAN_CROSSCUTTING.md`) — покрыт тестами в изоляции (мок `toaster` + `jsdom` для
`pagehide`/`beforeunload`, реальный Chakra-рендер не проверялся). Первая интеграция — 11
«Отменяемых» удалений в `domwellbes` (аудит confirm() 2026-09-23), все на
`triggerDeferredUndoableAction`; `triggerUndoableAction` (немедленный commit) уже жил в
`house-form.tsx` до этой интеграции — обе функции сосуществуют в одном приложении по признаку
наличия restore на сервере. Финализация мутации (конкретный `onCommit`/`action`, который
переживает unload или делает настоящий soft-delete) — ответственность каждого вызывающего
компонента, не этой библиотеки. Вопрос переноса хелпера непосредственно в `@letar/ui` — у
координатора, статус фиксировать здесь после ответа.

**Обновление 2026-09-23 (та же дата, следующий проход):** 9 из 11 «Отменяемых» удалений
(`blog-post`, `case`, `manufacturer`, `ownership-cost-profile`, `portfolio`, `promotion`,
`team-member`, `testimonial`, `vacancy`) оказались не просто похожими вызовами
`triggerDeferredUndoableAction`, а дословно одним и тем же сценарием «форма записи → удалить →
редирект на список» с разницей в 3 значениях. Извлечено в `useDeleteWithUndoRedirect` (см. API
выше) и применено во всех 9. Оставшиеся два (`client-contacts-section.tsx`,
`counterparty-requests-table.tsx`) — не подошли под абстракцию: там нет редиректа, состояние
локальное оптимистичное поверх списка, а не переход на другую страницу — используют
`triggerDeferredUndoableAction` напрямую, и это правильно, не недосмотр.

**Обновление 2026-09-23 (третий проход):** `deleteAction`/`onCommit` может вернуть `ActionFailure`
значением вместо throw (`catchActionFailure` из `@letar/forms-core`, например при FK-нарушении на
удалении) — `onCommit` внутри `useDeleteWithUndoRedirect` разворачивает такой результат сам через
`unwrapActionResult` **до** того, как передать его дальше в `triggerDeferredUndoableAction`; без
этого отказ значением тихо считался успешным коммитом (запись выглядела удалённой, хотя удаление
на сервере не прошло) — тот же класс бага, что и в `useInlineCrudList`/`useActionWithToast`
(`@letar/admin-ui`), см. `apps/domwellbes/PLAN_CROSSCUTTING.md`. Добавлена реальная зависимость
`@letar/forms-core` в `package.json` библиотеки.

## Команды

```bash
nx test undo-toast
nx lint undo-toast
nx typecheck:tsgo undo-toast
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/undo-toast` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/undo-toast` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
