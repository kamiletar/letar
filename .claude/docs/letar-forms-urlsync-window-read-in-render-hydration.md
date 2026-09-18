# `useFormUrlSync`: чтение `window.location` в рендере расходится с SSR

Найдено 2026-09-17 на `apps/studio` (фильтры `billable`/`status`/`kind` через `StudioForm.UrlSync`),
исправлено в `@letar/forms` 2.14.20.

## Симптом

Полная навигация на `/owner/time?billable=billable` (не SPA-переход): Select на первом кадре
показывает дефолт «Все записи», хотя `window.location.search` уже верный. Иногда значение «само»
исправляется через ~0,5 с, иногда (по словам владельца, на prod) остаётся неверным. В консоли —
recoverable hydration error, который легко принять за шум.

## Механизм

`useFormUrlSync` вызывал `readUrlValues` синхронно в теле хука:

- **SSR**: `window` не определён → функция возвращает `defaults`. Разметка отдаёт «Все записи».
- **Первый клиентский рендер (он же гидратационный)**: `window` уже есть, URL уже настоящий →
  функция возвращает значения из URL. Клиентское дерево расходится с серверным HTML.

React квалифицирует это как recoverable hydration error и перепланирует клиентский ре-рендер
поддерева. Именно этот отложенный ре-рендер «чинит» значение — через `initialValue`, который
`FormSimple` отдаёт в `useAppForm({ defaultValues })`, а TanStack Form подтягивает `defaultValues`
в `state.values`, пока форма не touched. Самоисправление не гарантировано: оно зависит от `Suspense`
выше по дереву и от тайминга планировщика.

Тот же класс, что [ssr-hydration-persisted-state](/.claude/docs/ssr-hydration-persisted-state.md)
(`localStorage` в инициализаторе `useState`), только источник — URL.

## Правило

Всё, что зависит от `window` (URL, `localStorage`, `matchMedia`), читается **после маунта** —
`useEffect` — а не в теле компонента/хука. Первый клиентский рендер обязан совпадать с SSR.
`typeof window === 'undefined'` в чистой функции ситуацию не спасает: на клиенте условие уже ложно
уже на гидратации.

## Как устроен фикс

```tsx
const [urlOverrides, setUrlOverrides] = useState<Partial<TData> | null>(null)
useEffect(() => {
  /* читаем URL, кладём в state только поля, отличающиеся от defaults */
}, [])
const initialValue = urlOverrides ? { ...defaults, ...urlOverrides } : defaults
```

Два неочевидных решения:

- В state лежат **переопределения из URL**, а не готовый `initialValue`. Готовый объект залипал бы на
  `defaults` первого рендера: приложения передают `defaults` литералом, и их изменение между
  рендерами терялось бы.
- Если в URL нет ни одного фильтра, state не трогается — лишнего ре-рендера нет.

Цена: короткая (доли кадра) вспышка дефолта на полной навигации. Это осознанный размен — вместо
неопределённо долгого/невоспроизводимого зависания на неверном значении.

## Что проверено

- Значение из URL появляется после эффекта; гидратация не даёт mismatch (`renderToString` +
  `hydrateRoot`, `console.error` без hydration-ошибок).
- Внутри `<Form>` поле получает значение, а `Form.UrlSync` не стирает параметр: его подписка на store
  переустанавливает debounce на каждое изменение, и финальная запись идёт уже с значениями из URL.
- Регрессия: изменение `defaults` между рендерами подхватывается.

## Смежные ловушки

- [letar-forms-field-date-urlsync-date-object](/.claude/docs/letar-forms-field-date-urlsync-date-object.md) —
  `Field.Date` коммитил `Date` вместо строки.
- [letar-forms-urlsync-missing-router-no-rsc-refetch](/.claude/docs/letar-forms-urlsync-missing-router-no-rsc-refetch.md) —
  `UrlSync` без `router` меняет URL, но не перезапрашивает RSC-данные.

## ⚠️ Не исправлено: `useUrlPrefill` — тот же дефект

`useUrlPrefill` (`libs/forms/src/lib/declarative/use-url-prefill.ts`) читает `window.location.search`
внутри `useMemo` — та же ловушка на SSR-странице. Другой хук с другой семантикой (prefill из
маркетинговых ссылок, `cleanUrl`), в запрос studio не входил — вынесено отдельным пунктом в
`libs/forms/PLAN.md`. Потребители в репо: демо `form-docs` и `form-example`.
