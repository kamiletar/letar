# @letar/forms-core

forms-core — shared-библиотека монорепо letar

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { feature } from '@letar/forms-core'
```

## API

### `feature()`

<!-- Опиши публичный API здесь -->

## Команды

```bash
nx test forms-core
nx lint forms-core
nx typecheck:tsgo forms-core
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/forms-core` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/forms-core` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
