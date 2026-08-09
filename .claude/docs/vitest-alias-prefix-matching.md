# Vitest/Vite `resolve.alias` матчит по префиксу — порядок ключей решает

При программной генерации объектного `resolve.alias` из `package.json` → `exports`
библиотеки с несколькими точками входа порядок ключей ломает резолв, если bare-ключ
пакета (`.` в `exports`) окажется раньше своих подпутей.

## Механизм

Vite резолвит объектный `resolve.alias` через `rollup-plugin-alias`. Он матчит **по
префиксу**, не по точному совпадению, и перебирает записи в порядке их появления в
объекте — первое совпадение побеждает и обработка останавливается.

`package.json` → `exports` обычно перечисляет `"."` первым ключом:

```json
{
  "exports": {
    ".": { "@letar/source": "./src/index.ts" },
    "./schema": { "@letar/source": "./src/schema.ts" },
    "./utils": { "@letar/source": "./src/utils.ts" }
  }
}
```

Наивная генерация alias-объекта через `Object.entries(exports).map(...)` сохраняет этот
порядок:

```ts
// ❌ Bare-ключ первым — перехватывает все подпути
const alias = Object.fromEntries(
  Object.entries(exports).map(([subpath, target]) => [
    subpath === '.' ? '@letar/x' : `@letar/x${subpath.slice(1)}`,
    resolve(__dirname, target['@letar/source']),
  ]),
)
// { '@letar/x': ..., '@letar/x/schema': ..., '@letar/x/utils': ... }
```

`@letar/x` матчит по префиксу любой импорт, начинающийся с этой строки — включая
`@letar/x/schema` и `@letar/x/utils`. Поскольку `@letar/x` идёт первым в объекте, он
перехватывает эти импорты **до** того, как очередь доходит до их собственной, более
специфичной записи. Итог — все импорты подпутей резолвятся в `src/index.ts` главной
точки входа вместо своих файлов.

## Как узнать: TS зелёный, тесты валятся пачками

Это чисто рантайм-ловушка Vite/Rollup — `tsc`/`tsgo` резолвят модули иначе (через
`paths` в tsconfig) и её не видят. Симптом — `nx test <lib>` (или `vitest run`) валит
десятки файлов сразу с ошибками вида «не найден экспорт» или «не тот модуль», хотя
`nx typecheck:tsgo <lib>` проходит чисто. Прецедент (Фаза 7.1, Этап 4,
[libs/forms/PLAN.md](/libs/forms/PLAN.md)): 70 из 98 тестовых файлов упали разом при
подключении вычисленного alias-объекта.

## Фикс

Сортировать ключи по длине по убыванию перед тем, как передавать объект в
`resolve.alias` — более длинные (специфичные) ключи должны матчиться раньше короткого
bare-ключа:

```ts
const alias = Object.fromEntries(
  Object.entries(exports)
    .filter(([subpath]) => subpath !== './package.json')
    .map(([subpath, target]) => [
      subpath === '.' ? '@letar/x' : `@letar/x${subpath.slice(1)}`,
      resolve(__dirname, target['@letar/source']),
    ])
    .sort(([a], [b]) => b.length - a.length),
)
```

Образец в репозитории — [libs/forms/vitest.config.ts](/libs/forms/vitest.config.ts)
(генерирует alias для `@letar/forms-core` из его `package.json`).

## Ручные alias — тот же принцип, без генерации

Библиотеки с ручным (не программным) alias-блоком для подпутей уже следуют правилу
интуитивно — подпуть объявлен строкой раньше базового ключа, с комментарием:

```ts
resolve: {
  alias: {
    // Подпуть объявляем раньше корня: иначе '@letar/image-upload' совпадёт первым
    // и '/server' приклеится к пути основной точки входа.
    '@letar/image-upload/server': resolve(__dirname, '../../libs/image-upload/src/server'),
    '@letar/image-upload': resolve(__dirname, '../../libs/image-upload/src'),
  },
},
```

Проверено по всему монорепо (2026-08-09): все ручные alias-блоки для библиотек с
подпутями (`image-upload`) уже соблюдают этот порядок. Только `libs/forms/vitest.config.ts`
строит alias программно из `exports` — единственное место, где явная сортировка
обязательна, потому что порядок ключей не контролируется руками.

## Общее правило

Заводишь `resolve.alias` (объектной формой, не массивом `{find, replacement}`) для
библиотеки с несколькими точками входа — в любом vitest/vite конфиге:

- Ручной alias — подпуть **всегда** раньше базового ключа пакета, с комментарием-
  напоминанием почему.
- Программная генерация из `exports`/`paths` — сортировка по длине ключа по убыванию
  перед сборкой объекта, не полагаться на порядок `Object.entries`.
- Массив-форма `resolve.alias: [{find, replacement}]` (не используется в этом репо)
  этой проблеме не подвержена — Vite матчит массив в заданном порядке, но не по
  префиксу, если `find` — точная строка, а не RegExp с открытым концом.

## Ссылки

- [lib-entry-points.md](/.claude/docs/lib-entry-points.md) — общий паттерн нескольких
  точек входа у библиотеки (`exports`, `paths`, теги, `eslint`).
- [libs/forms/PLAN.md](/libs/forms/PLAN.md) — Фаза 7.1, Этап 4, разбор находки.
