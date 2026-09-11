# ⚠️ `flexWrap="wrap"` безусловный на `Stack`/`Flex` с адаптивным `direction` — переполнение на mobile

**Класс бага:** `<Stack direction={{ base: 'column', sm: 'row' }} flexWrap="wrap">` (или `Flex` с
тем же сочетанием пропов) выглядит логично — «перенос строки для узкого экрана», — но на
`base`-брейкпоинте, где `direction` реально `'column'`, приводит к **горизонтальному**
переполнению документа, а не к переносу вниз.

## Root cause

CSS `flex-wrap` переносит элементы по **cross-axis**, а не по main-axis. Cross-axis зависит от
`flex-direction`:

- `flex-direction: row` → main-axis горизонтальный, cross-axis вертикальный → `wrap` переносит
  лишние элементы **вниз**, в новую строку. Это и есть ожидаемое поведение.
- `flex-direction: column` → main-axis вертикальный, cross-axis горизонтальный → `wrap` переносит
  лишние элементы **вбок**, в новую колонку. На мобильном экране это и есть переполнение: контейнер
  растягивается по ширине ровно настолько, сколько нужно для второй (и следующих) колонок.

Chakra `Stack`/`Flex` компилируют `direction={{ base: 'column', sm: 'row' }}` в media-query CSS —
на `base` реально применяется `flex-direction: column`. Если рядом стоит безусловный
`flexWrap="wrap"`, на этом брейкпоинте срабатывает именно горизонтальный перенос, а не
вертикальный.

## Почему не ловится обычными проверками

- `nx lint`, `nx typecheck:tsgo`, `nx test` — зелёные, оба пропа валидны по отдельности.
- На десктопе (где `direction` уже `'row'`) поведение корректное — баг не воспроизводится ни в
  одном скриншоте шире брейкпоинта, на котором `direction` переключается на `row`.
- Переполнение появляется только когда реального контента достаточно, чтобы `wrap` вообще
  сработал (два и более элемента, не помещающихся по высоте/ширине контейнера) — на пустых
  demo-данных может быть незаметно.

Тот же класс проверки, что у [admin-table-horizontal-overflow](/.claude/docs/admin-table-horizontal-overflow.md)
— переполнение видно только на узком вьюпорте и только по `document.documentElement.scrollWidth`,
глазом на десктопном скриншоте не отличить от нормы.

## Лечение

Сделать `flexWrap` условным той же формой, что и `direction` — `wrap` включается только там, где
`direction` реально `'row'`:

```tsx
// ❌ безусловный flexWrap — ломается на base, где direction="column"
<Stack direction={{ base: 'column', sm: 'row' }} gap={3} flexWrap="wrap">

// ✅ wrap только на брейкпоинте, где direction реально "row"
<Stack direction={{ base: 'column', sm: 'row' }} gap={3} flexWrap={{ base: 'nowrap', sm: 'wrap' }}>
```

Брейкпоинт в `flexWrap` должен буквально совпадать с тем, на котором `direction` переключается на
`'row'` (не обязательно `sm` — смотреть по конкретному компоненту).

## Как искать

Паттерн — `Stack`/`Flex` с одновременно:

1. `direction={{ base: 'column', ... }}` (адаптивная смена direction, `column` на `base`);
2. `flexWrap="wrap"` **на том же теге**, без объектной формы.

```bash
git grep -n 'flexWrap="wrap"' -- '*.tsx'
```

и для каждого совпадения — проверить, стоит ли на том же теге `direction={{ base: 'column', ... }}`.
Одного грепа по `flexWrap="wrap"` недостаточно: подавляющее большинство совпадений — это `HStack`
(direction всегда `'row'`, багу не подвержен) или `Flex`/`Stack` без адаптивного `direction`
вовсе — там `flexWrap="wrap"` безусловный корректен и является штатным фиксом для другого,
соседнего класса переполнения (не переносящаяся `HStack`-строка кнопок, см. тот же
`admin-table-horizontal-overflow.md` § «Соседний симптом»).

## Известные места (аудит публичного репо, 2026-09-11)

Аудит `git grep 'direction={{ base: \'column\'' -- '*.tsx'` (27 совпадений) с последующей сверкой
на соседний `flexWrap="wrap"` **на том же теге**. Три из четырёх кандидатов с `flexWrap="wrap"`
рядом оказались ложным срабатыванием (проп стоит на другом, вложенном элементе, не на теге с
`direction`) — багу не подвержены:

| Файл                                                                     | Статус                                                                   |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `apps/domwellbes/src/app/(admin)/_components/period-range-form.tsx`      | ✅ починено (приватный submodule, коммит `c5c6301`, 2026-09-11)          |
| `apps/kami-key-the-landing/src/app/_components/hero-section.tsx`         | ✅ починено (этот аудит)                                                 |
| `apps/animatrona-tracker/.../profile/[userId]/profile-public-client.tsx` | не подвержен — `flexWrap` на другом элементе, не на `Flex` с `direction` |
| `apps/animatrona-landing/src/app/_components/hero-section.tsx`           | не подвержен — аналогично                                                |
| `apps/animatrona-tracker/.../cards/anime-moderation-card.tsx`            | не подвержен — аналогично                                                |

`kami-key-the-landing` (лендинг, `HERO_MAPPINGS` — блок из 4 карточек-примеров под заголовком) на
момент аудита без явного `maxH`/жёсткого ограничения по высоте контейнера, поэтому реального
переполнения на 375px замерами Browser pane не подтверждено (низкий риск, а не доказанный баг) —
починено превентивно тем же способом, раз паттерн идентичен и правка дешёвая:

```diff
- <Flex
-   direction={{ base: 'column', sm: 'row' }}
-   gap={3}
-   justify="center"
-   flexWrap="wrap"
+ <Flex
+   direction={{ base: 'column', sm: 'row' }}
+   gap={3}
+   justify="center"
+   flexWrap={{ base: 'nowrap', sm: 'wrap' }}
```

Остальные submodule (`aboi`, `driving-school`, `aprel8008`, `svoichuzhie`, `dsperevod`, `studio` и
т.д.) этим аудитом не проверялись — `git grep` из публичного репо не заходит в submodule (gitlink,
не каталог, см.
[verification-pitfalls § git grep и приватные submodule](/.claude/docs/verification-pitfalls.md#парный-к-предыдущему-git-grep-врёт-в-успокаивающую-сторону--он-не-заходит-в-приватные-submodule)) —
для полного покрытия нужен рекурсивный `grep` по каждому submodule отдельно.
