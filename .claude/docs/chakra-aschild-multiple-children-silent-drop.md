# `asChild` с несколькими детьми молча рендерит только первого — без единой ошибки

## Симптом

Компонент, который должен появляться по клику/условию (drawer, popover, что угодно рядом с
основным контентом), никогда не монтируется — ни в DOM, ни в консоли, ни в typecheck/lint нет ни
одной жалобы. `useState`, управляющий его видимостью, честно переключается (проверяется через
React fiber, не через `getComputedStyle`/console — там смотреть нечего).

## Причина

`factory.js` (`@chakra-ui/react`, `styled-system/factory.js`) реализует `asChild` так:

```js
const child = React.isValidElement(props.children)
  ? React.Children.only(props.children)
  : React.Children.toArray(props.children).find(React.isValidElement)
```

Если у компонента с `asChild` **больше одного** дочернего React-элемента, ветка
`Children.only` не срабатывает (это не единственный элемент) — код уходит во вторую ветку и
берёт **первый попавшийся** валидный элемент через `.find()`. Остальные дети просто выбрасываются
молча: `.find()` не бросает исключение на «лишних» совпадениях, в отличие от `Children.only`,
который на двух и более детях кинул бы `Invariant: Children.only`.

```tsx
// ❌ Второй ребёнок (Drawer.Root) никогда не рендерится — .find() вернул только <header>
<Box asChild position="sticky" ...>
  <header>...</header>
  <Drawer.Root open={open} onOpenChange={...}>...</Drawer.Root>
</Box>
```

## Как чинить

`asChild`-обёртка должна оборачивать **ровно один** элемент. Всё остальное — соседи снаружи,
через фрагмент:

```tsx
// ✅ Drawer.Root — сосед Box, а не второй ребёнок asChild-контейнера
<>
  <Box asChild position="sticky" ...>
    <header>...</header>
  </Box>
  <Drawer.Root open={open} onOpenChange={...}>...</Drawer.Root>
</>
```

## Как это выглядит вживую

Ни `nx typecheck:tsgo`, ни `nx lint` (`oxlint` + `theme:check`) не ловят это — `children` типом
`React.ReactNode` пропускает любое количество элементов, а рантайм не бросает исключение. Нашлось
только живым кликом в браузере: `React.Children.toArray` возвращает первый элемент без ошибок,
приложение выглядит рабочим (header отрисован), только один конкретный интерактивный узел просто
не появляется. Классический пример того, почему `nextjs-apps.md`/CLAUDE.md требуют реальной
проверки в браузере для UI-правок, а не только зелёного typecheck.

## Родственные грабли

Похожий класс — `Children.only` кидает исключение (видимую ошибку), когда RSC-граница
заворачивает единственного ребёнка в массив длины 1:
[nextjs-rsc-aspectratio-children-only.md](/.claude/docs/nextjs-rsc-aspectratio-children-only.md).
Там баг **шумный** (500 на роуте); здесь — полностью **тихий** (страница рендерится, часть
функциональности просто отсутствует). Разные механизмы одного корня — `asChild`/`AspectRatio`
работают с `children` через `React.Children`, а не через явный единственный проп.

## Где встретилось

`apps/aboi/src/app/[locale]/_components/header-shell.tsx` — mobile drawer Header'а редизайна
«Оптическая галерея» (2026-08-25, PLAN.md §11.6 R1.8).
