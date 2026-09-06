# @letar/folder-player-react

Папочный плеер — React-слой, общий для Animatrona и Animatrona Player

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { Feature } from '@letar/folder-player-react'
```

## API

### `<Feature />`

<!-- Опиши публичный API здесь -->

## Команды

```bash
nx test folder-player-react
nx lint folder-player-react
nx typecheck:tsgo folder-player-react
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/folder-player-react` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/folder-player-react` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
