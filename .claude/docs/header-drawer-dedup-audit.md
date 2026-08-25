# Header + mobile Drawer — аудит дублирования между приложениями (2026-08-25)

## Вопрос

При редизайне aboi (`header-shell.tsx`, §11.6 R1.8) выяснилось, что похожий паттерн
«sticky/обычный Box-header + гамбургер + `Drawer.Root` с nav-списком» встречается ещё в 6 местах:
`animatrona-tracker`, `dsperevod`, `grandslamcup` (×4: `admin-header`, `coach-header`,
`poet-header`, `mobile-drawer`), `svoichuzhie` (`admin-mobile-header`). Вопрос — стоит ли выносить
общий `libs/ui`-примитив (shared-first, см. корневой `CLAUDE.md`).

## Вывод: между приложениями — НЕ выносить

Прочитаны все 7 файлов целиком. Общая форма есть только на уровне «используем `Drawer.Root` +
кнопка-гамбургер для мобильного меню» — это описание самого API Chakra Drawer, а не специфичный
переиспользуемый паттерн. Расхождения по каждой оси реальные, не косметические:

| Ось                  | aboi                              | animatrona-tracker                            | dsperevod                         | svoichuzhie admin                                                    |
| -------------------- | --------------------------------- | --------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| Позиционирование     | sticky + прозрачность over-hero   | обычный (не sticky)                           | sticky + blur                     | sticky                                                               |
| Drawer placement     | `start`                           | `end`                                         | `end`                             | `start`                                                              |
| Триггер              | `IconButton onClick` + `useState` | `IconButton onClick` + `useState`             | `IconButton onClick` + `useState` | кастомный `Box asChild` SVG-гамбургер, `Drawer.Root open` controlled |
| Закрытие пункта меню | `onClick` на каждом Item          | `onClick` на каждом Item                      | `onClick` на каждом Item          | `useEffect` на смену `pathname`                                      |
| Источник nav         | проп `navItems`                   | хардкод + `@letar/ui` auth-секция             | хардкод `NAV_ITEMS`               | `NAV_GROUPS` (группы с заголовками)                                  |
| Auth-интеграция      | нет (aboi без сессии в header)    | `useSession`, `MobileAuthSection`, `UserMenu` | нет                               | нет (staff-контекст)                                                 |

Заставить это в один компонент — либо давать ему 15+ проп (флаги на каждую ось), либо часть
логики (over-hero прозрачность aboi, grouped-nav с separators svoichuzhie, auth-секция
animatrona-tracker) всё равно останется app-specific кодом снаружи компонента. Это ровно
преждевременная абстракция, которую запрещает `CLAUDE.md` («Don't design for hypothetical future
requirements»). **Решение: не выносить.**

## Вывод: ВНУТРИ grandslamcup — есть реальный дубль, кандидат на извлечение

`admin-header.tsx`, `coach-header.tsx`, `poet-header.tsx` (все три — `apps/grandslamcup/src/app/<role>/_components/`)
— практически один и тот же файл:

- идентичная разметка `Box → Container → Flex` с гамбургером слева и user-инфо справа;
- идентичный `Drawer.Root placement="start"` с `Drawer.Trigger asChild` → `IconButton`;
- идентичный `Drawer.Context` render-prop для `store.setOpen(false)` по клику на пункт;
- идентичный рендер списка (`IconComponent` + `Text`, `isActive` подсветка, `borderLeftWidth`
  отсутствует здесь, но паттерн активного пункта общий).

Различия — ровно то, что и должно быть параметрами: `colorPalette` (`brand` у admin, `teal` у
coach/poet), заголовок Drawer, источник `navItems` (`navItems`/`coachNavItems`/`poetNavItems`),
правая часть шапки (imя/команда/публичный профиль — разного вида, но всегда `Text` + опционально
`Link`).

**✅ Реализовано 2026-08-25** — локальный shared-компонент в самом grandslamcup —
`apps/grandslamcup/src/app/_components/role-header.tsx` (НЕ `libs/ui` — паттерн специфичен
трёхпортальной структуре admin/coach/poet этого приложения, вне grandslamcup такого разделения
ролей нет):

```tsx
interface RoleHeaderProps {
  title: string
  colorPalette: 'brand' | 'teal'
  navItems: { href: string; label: string; icon: IconType }[]
  drawerTitle: string
  rightContent: React.ReactNode // имя/команда/ссылка — остаётся на вызывающей стороне
  isActive: (pathname: string, href: string) => boolean
}
```

Три файла-обёртки (`admin-header.tsx` и т.д.) сжимаются до вызова `RoleHeader` с нужными
пропами. Механическое и безопасное изменение (нет расхождений в поведении, только в данных).

Реализация — `apps/grandslamcup/src/app/_components/header/role-header.tsx` (внутри уже
существовавшей папки `_components/header/`, не в отдельном файле на уровне `app/`).
Фактическая сигнатура чуть отличается от черновика выше: `title`/`shortTitle` (админский
хедер рендерит два breakpoint-варианта заголовка, coach/poet — один) и `rootHref` вместо
функции `isActive` (сравнение `pathname === rootHref` вынесено внутрь компонента).
Живая проверка — admin-роль (dev-сессия, `.claude/docs/verification-pitfalls.md`-класс
проверок через DOM вместо скриншота, т.к. Browser pane была скрыта): гамбургер открывает
Drawer, активный пункт подсвечен нужной палитрой, клик по пункту закрывает Drawer и
переходит по ссылке. Coach/poet не тестировались живым кликом — в dev-БД нет пользователей с
этими ролями, только typecheck подтвердил совместимость типов `navItems`.

## Проверка на баг `asChild` с несколькими детьми

См. [chakra-aschild-multiple-children-silent-drop.md](/.claude/docs/chakra-aschild-multiple-children-silent-drop.md)
— в aboi нашли и уже исправили (`Drawer.Root` вынесен из `Box asChild` в соседа по фрагменту).
Проверены все 6 остальных файлов на тот же паттерн (`Box`/`IconButton`/`ChakraLink asChild` с
двумя и более детьми) — **не найдено**. Все `asChild`-обёртки в этих файлах оборачивают ровно один
элемент (`<NextLink>`, `<a>`, `<button>`). Латентных копий бага нет.

## Итог

Не заводить `libs/ui`-компонент по мотивам этого аудита. Единственное реальное действие —
опциональный локальный рефакторинг трёх файлов grandslamcup (см. выше), не блокирующий и не
срочный.
