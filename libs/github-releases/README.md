# @letar/github-releases

Общий клиент GitHub Releases API — вынесен из `apps/aira-web/src/lib/github.ts` и
`apps/animatrona-landing/src/lib/github.ts` (PLAN-INFRA.md §36), которые независимо
реализовывали один и тот же каркас (запрос с ISR+токеном, фильтрация draft/prerelease,
форматирование размера файла).

**Что осталось в приложениях (намеренно не унифицировано):** разбор конкретных ассетов
(платформа/архитектура/installer-vs-portable у aira, `.exe`/`.dmg`/`.AppImage` у animatrona),
парсинг release notes — эта логика специфична для каждого продукта.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { fetchLatestRelease, fetchReleases, formatFileSize } from '@letar/github-releases'
```

## API

### `fetchLatestRelease({ owner, repo, token?, tagPrefix? })`

Последний релиз репозитория (`GitHubRelease | null`). Без `tagPrefix` бьёт напрямую в
`GET /releases/latest` (один запрос). С `tagPrefix` — листает `/releases` и возвращает первый
релиз с тегом, начинающимся на префикс (нужно для монорепо, публикующего релизы нескольких
продуктов под одним GitHub-репозиторием тегами вида `<app>-v1.2.3` — без фильтра лендинг
показал бы релиз чужого приложения).

### `fetchReleases({ owner, repo, token?, tagPrefix?, limit? })`

Список релизов (`GitHubRelease[]`), новые сначала, `draft`/`prerelease` отфильтрованы. `limit`
по умолчанию 10.

### `formatFileSize(bytes: number): string`

`"512 B"` / `"2.0 KB"` / `"5.0 MB"`.

### Типы

`GitHubRelease`, `GitHubReleaseAsset` — минимальный срез полей GitHub Releases API, которые
использует эта библиотека (не полная схема API).

## Команды

```bash
nx test github-releases
nx lint github-releases
nx typecheck:tsgo github-releases
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/github-releases` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/github-releases` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
