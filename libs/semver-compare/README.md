# @letar/semver-compare

Сравнение `X.Y.Z` semver-строк без диапазонов и суффиксов пререлиза.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { compareSemver } from '@letar/semver-compare'
```

## API

### `compareSemver(a: string, b: string): number`

Возвращает положительное число, если `a` новее `b`, отрицательное — если старее, `0` — если
версии равны. Компоненты сравниваются как числа (`1.10.0` новее `1.9.0`), а не лексикографически
как строки. Отсутствующий компонент трактуется как `0` (`1.2` == `1.2.0`).

Не понимает диапазоны (`^1.2.3`), сборочные метаданные и суффиксы пререлиза (`-beta.1`) — только
голый `X.Y.Z`. Нужен полноценный semver — используй пакет `semver`.

### Зачем

GitHub Releases API (`GET /repos/{owner}/{repo}/releases`) не гарантирует порядок по убыванию
версии — в репозитории с частыми релизами свежий тег может какое-то время не быть первым в
списке. Вызывающий код собирает все releases с нужным префиксом тега и выбирает максимальный по
`compareSemver`, вместо того чтобы полагаться на `releases[0]`.

Используется в `@letar/github-releases` (`fetchLatestRelease`) и
`@letar/electron-monorepo-updater` (`findOwnLatestTag`).

## Команды

```bash
nx test semver-compare
nx lint semver-compare
nx typecheck:tsgo semver-compare
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/semver-compare` в реальные `dependencies` приложения
(`workspace:*`) и запусти `bun install` — только так bun создаст симлинк в его
`node_modules/@letar/semver-compare`, без которого не резолвится `typecheck:tsgo`/vitest.
`nx.implicitDependencies` — необязательный резервный канал, не замена `dependencies`.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
