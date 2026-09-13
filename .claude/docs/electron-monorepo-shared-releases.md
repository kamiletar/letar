# Electron-приложения в общем публичном репозитории: одна схема релизов на всех

**Проблема.** `kamiletar/letar` — публичный монорепо, и несколько Electron-приложений
(`animatrona`, `kami-key-the`, `animatrona-folder-player`, ...) публикуют туда же GitHub
Releases. Штатный `GithubProvider` из `electron-updater` всегда бьёт в repo-wide
`GET /repos/{owner}/{repo}/releases/latest` — это самый свежий релиз **любого** приложения
репозитория, не обязательно того, чей `autoUpdater` его запросил. Если у одного приложения
выйдет релиз позже, чем у другого, автообновление второго найдёт чужой релиз (более новый по
дате) и попытается применить его как своё обновление.

Найдено дважды: сперва у `kami-key-the` (CHANGELOG [1.7.4], 2026-09-13), затем эмпирически
подтверждено и у `animatrona` — на момент проверки в `kamiletar/letar` реально стояло только два
релиза, оба `kami-key-the-v*`, а `animatrona/main/updater.ts` вызывал голый
`autoUpdater.checkForUpdates()` без установки feed URL.

## Схема

Единая для всех Electron-приложений, публикующихся в `kamiletar/letar` (не в изолированный
собственный репозиторий — см. «Когда НЕ нужна эта схема» ниже):

1. **Тег релиза — `<app>-v<semver>`** (`animatrona-v1.2.3`, `kami-key-the-v1.7.4`,
   `animatrona-folder-player-v0.4.1`). Единственный способ различить "свой" релиз среди чужих в
   общем списке `GET /releases`.
2. **Публикация — НЕ `electron-builder --publish always`.** `--publish always` заставляет сам
   electron-builder создать релиз по собственному алгоритму тегирования — `v${version}` **без
   префикса приложения**. Тег без префикса ломает и рантайм-поиск (см. п.4), и захламляет общий
   список релизов репозитория тегами, не различающими приложения. `kami-key-the` уже наступал на
   это на первой попытке публикации (создался ошибочный релиз `v1.7.4`, пришлось удалять).
   Правильно — `electron-builder --win/--mac/--linux --publish never` (только упаковка) плюс
   отдельный шаг `gh release create`/`gh release upload` с явным префиксованным тегом.
3. **CI-шаблон** — `.github/workflows/release-animatrona-folder-player.yml` (эталон, рабочий).
   Триггер `push: tags: ['<app>-v*.*.*']`, `permissions: contents: write`, штатный
   `secrets.GITHUB_TOKEN` (PAT не нужен — релиз пишется в тот же репозиторий, где выполняется
   workflow). Джобы: `create-release` (draft, notes из CHANGELOG) → `build-<platform>`
   (`electron-builder --publish never` + `gh release upload --clobber`) → `publish-release`
   (`gh release edit --draft=false`).
4. **Рантайм (только приложениям с реальным автообновлением)** — библиотека
   `@letar/electron-monorepo-updater` (`findOwnLatestTag`/`pointFeedAtOwnRelease`). Перед
   `autoUpdater.checkForUpdates()` находит свой тег через `GET /releases` (не `/latest`) по
   префиксу и подставляет `electron-updater` `generic`-провайдер на URL конкретного релиза.
   Приложению без автообновления (например `animatrona-folder-player` на 2026-09-13) это не
   нужно — только `--publish never` в CI, феда для рантайма нет вовсе.

## Грабля с именами ассетов

`electron-builder` называет файлы с пробелами (`KamiKeyThe Setup 1.7.4.exe`), а сам `latest.yml`
внутри пишет имя с **дефисами** (`KamiKeyThe-Setup-1.7.4.exe`). `gh release upload`/`create` с
оригинальным именем (пробелы) сам санитизирует его — но заменяет пробелы на **точки**, не на
дефисы. Результат — файл на GitHub называется не так, как ожидает `latest.yml`,
`electron-updater` получает 404 при попытке скачать обновление. Переименовывать файлы под
дефисный формат **перед** загрузкой, не полагаться на автоматическую санитизацию имени со
стороны `gh` или GitHub.

## Почему не отдельный репозиторий на приложение

До 2026-09-13 у `animatrona` была другая схема: `.github/workflows/release-animatrona.yml`
клонировал `kamiletar/animatrona` (отдельный публичный репозиторий), копировал туда исходники
через rsync и публиковал релизы там же, требуя долгоживущий PAT (`secrets.GH_TOKEN`) с правами на
чужой (относительно раннера) репозиторий. Эта схема признана устаревшей и заменена на публикацию
прямо в `kamiletar/letar` по образцу `animatrona-folder-player`:

- нет двойного источника истины (исходники только в `letar`, не дублируются rsync'ом);
- не нужен PAT — хватает штатного `GITHUB_TOKEN` с правами `contents: write` на тот же репозиторий;
- меньше кода в workflow (нет джобы `publish-source`).

`kamiletar/animatrona` как репозиторий не удалён (решение об архивации/удалении — за владельцем,
вне зоны ответственности CI), но новый workflow в него больше не пишет.

**Когда дедикейтед-репозиторий на приложение всё же оправдан:** если релизы приложения по любой
причине должны жить отдельно от публичного монорепо (другая политика доступа, другой владелец
— как у `label-printer-desktop`, который публикуется в `lena/label-printer-desktop`, полностью
изолированный аккаунт/репозиторий). В таком случае коллизии `/releases/latest` не бывает по
построению (в репозитории ровно одно приложение) — схема выше не нужна, обычный `GithubProvider`
работает корректно.

## Чек-лист для нового Electron-приложения в `letar`

1. `electron-builder.yml`: `publish: { provider: github, owner: kamiletar, repo: letar }`.
2. `project.json`: `build:win`/`build:mac`/`build:linux` targets с `--publish never`. **Не заводи
   `release:*` target с `--publish always`** — реальный релиз всегда идёт через CI-workflow, не
   через nx target.
3. `.github/workflows/release-<app>.yml` — копия `release-animatrona-folder-player.yml`, замена
   имени приложения/тега/путей сборки.
4. Если нужно реальное автообновление в рантайме — `@letar/electron-monorepo-updater` в
   `dependencies` (не только `implicitDependencies`, см.
   [libs.md](/.claude/rules/libs.md#подключение-к-приложению)) + `pointFeedAtOwnRelease()` перед
   `autoUpdater.checkForUpdates()`.

## Файлы

- `libs/electron-monorepo-updater/` — общая рантайм-либа.
- `apps/animatrona/main/updater.ts`, `apps/kami-key-the/main/updater.ts` — потребители.
- `.github/workflows/release-animatrona-folder-player.yml` — эталонный CI-шаблон.
- `.github/workflows/release-animatrona.yml` — переписан под эту схему 2026-09-13 (было —
  зеркалирование в `kamiletar/animatrona`).
