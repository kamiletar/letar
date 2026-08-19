# `nx.configs['flat/react-typescript']` не регистрирует `eslint-plugin-react-hooks`

**Симптом:** `eslint-disable-next-line react-hooks/exhaustive-deps` в коде сам становится ошибкой
ESLint — `Definition for rule 'react-hooks/exhaustive-deps' was not found`. Выглядит как «мёртвый
комментарий», который можно спокойно удалить — на самом деле сигнал, что правило вообще не
подключено и никогда не проверялось.

## Причина

Типовой `apps/<app>/eslint.config.mjs` в этом монорепо выглядит так:

```js
import nx from '@nx/eslint-plugin'
import baseConfig from '../../eslint.config.mjs'

export default [
  ...nx.configs['flat/react-typescript'],
  ...baseConfig,
  // ...
]
```

`nx.configs['flat/react-typescript']` (пакет `@nx/eslint-plugin`) — это набор `{files, rules}` без
блока `plugins`. Он включает `default-case`, `@typescript-eslint/*` и подобное, но **не**
регистрирует `eslint-plugin-react-hooks`. Правила `react-hooks/rules-of-hooks` и
`react-hooks/exhaustive-deps` без явной регистрации плагина не резолвятся вообще — ESLint либо
молча их игнорирует (если правило нигде не включено явно), либо, если где-то стоит
`eslint-disable-next-line` на это правило, кидает ошибку про несуществующее правило.

Проверено 2026-08-19: ревизия ~22 приложений с этим паттерном (`apps/studio`,
`apps/driving-school`, `apps/dashboard`, `apps/mandala` и т.д.) показала, что ни одно из них не
регистрировало плагин самостоятельно — только `apps/animatrona` чинил это точечно в своём
`eslint.config.mjs` до централизованного фикса.

## Фикс

Регистрация плагина внесена в корневой [eslint.config.mjs](/eslint.config.mjs) одним блоком —
все приложения, спредящие `...baseConfig`, получают фикс автоматически, без правки каждого
файла по отдельности:

```js
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export default [
  // ...
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'react-hooks': reactHooksPlugin },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // ...
]
```

Подключены только две классические проверки. Пресет `recommended` у `eslint-plugin-react-hooks`
v7 тянет ещё ~14 правил React Compiler (purity, immutability, set-state-in-effect и т.п.) — это
отдельная задача, не входит в этот фикс.

## Ловушка при включении: `rules-of-hooks` — `error`, не `warning`

`exhaustive-deps` — предупреждение, включение плагина заново не ломает `nx lint`. Но
`rules-of-hooks` — `error`. Если в приложении есть код, который вызывает хук условно/внутри
callback (даже безопасно, в рамках render-prop паттерна), включение плагина превращает
существующий, годами лежавший в коде паттерн в падающий `nx lint`.

Прецедент — `apps/driving-school`, 10 комбобоксов (`src/driving-school-form/comboboxes/*.tsx`):
хук вызывается внутри `useQuery`-пропа `FieldCombobox`, который сам исполняет проп-функцию
синхронно при рендере — безопасно, но статический анализ ESLint этого доказать не может. Паттерн
уже был помечен `oxlint-disable-next-line react-hooks/rules-of-hooks` (oxlint эту проверку видел
раньше), но парной `eslint-disable-next-line` не было — ESLint её и не требовал, пока правило не
резолвилось.

**Проверять после включения плагина в любом новом приложении:** прогнать `nx lint <app>` и для
каждой всплывшей `rules-of-hooks`-ошибки НЕ гасить её вслепую комментарием — сначала убедиться,
что вызов хука действительно безопасен (execute синхронно при рендере через контракт компонента,
как `FieldCombobox`), а не реальный баг с условным вызовом хука.

## Связанное

- `apps/animatrona/eslint.config.mjs` — исходный точечный фикс до централизации, комментарий там
  объясняет то же самое.
- [PLAN.md §52](/PLAN.md) — разбор сессии, в которой найдено и исправлено.
