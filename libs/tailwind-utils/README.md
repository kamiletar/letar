# @letar/tailwind-utils

tailwind-utils — shared-библиотека монорепо letar

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { feature } from '@letar/tailwind-utils'
```

## API

### `feature()`

<!-- Опиши публичный API здесь -->

## Команды

```bash
nx test tailwind-utils
nx lint tailwind-utils
nx typecheck:tsgo tailwind-utils
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/tailwind-utils` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/tailwind-utils` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
