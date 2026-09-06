# @letar/folder-scan

Папочный плеер — скан папок/дорожек в main-процессе, общий для Animatrona и Animatrona Player

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { feature } from '@letar/folder-scan'
```

## API

### `feature()`

<!-- Опиши публичный API здесь -->

## Команды

```bash
nx test folder-scan
nx lint folder-scan
nx typecheck:tsgo folder-scan
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/folder-scan` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/folder-scan` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
