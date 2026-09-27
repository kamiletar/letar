# Changelog

## 0.2.0 (2026-09-27)

### Changed

- `compareSemver` вынесен в `@letar/semver-compare` — был дословной копией одноимённой функции
  из `libs/electron-monorepo-updater/src/lib/find-own-release.ts`, теперь обе библиотеки делят
  одну реализацию.

## 0.1.1 (2026-09-27)

### Fixed

- `fetchLatestRelease` с `tagPrefix` больше не берёт `releases[0]` как «последний релиз» — GitHub
  `GET /releases` не гарантирует порядок по убыванию версии (ручные перевыпуски, hotfix вне
  порядка, несколько продуктов монорепо в одном ответе). Теперь среди релизов, совпавших по
  префиксу тега, выбирается релиз с максимальной semver-версией — тот же фикс, что уже стоит в
  `libs/electron-monorepo-updater/src/lib/find-own-release.ts`.
