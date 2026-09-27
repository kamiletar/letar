# Changelog

## 0.1.1 (2026-09-27)

### Fixed

- `fetchLatestRelease` с `tagPrefix` больше не берёт `releases[0]` как «последний релиз» — GitHub
  `GET /releases` не гарантирует порядок по убыванию версии (ручные перевыпуски, hotfix вне
  порядка, несколько продуктов монорепо в одном ответе). Теперь среди релизов, совпавших по
  префиксу тега, выбирается релиз с максимальной semver-версией — тот же фикс, что уже стоит в
  `libs/electron-monorepo-updater/src/lib/find-own-release.ts`.
