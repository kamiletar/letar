# Очередь задач Animatrona

Проект `animatrona`, префикс `AN`. Десктоп-приложение (Electron + Next.js): библиотека аниме,
импорт с торрентов, транскод (NVENC, SVT-AV1), раздача через IPFS, встроенный плеер. Продакшена
на сервере нет, релизы идут через GitHub Releases по тегам `animatrona-v*`.

## Как пользоваться

Задача — один файл `tasks/AN-NNN-slug.md` со статусом в шапке; закрытые лежат в
`tasks/done/ГГГГ-ММ/`. Список собирает команда из корня монорепо:

```bash
bun scripts/tasks.mjs next animatrona
```

Дальше: `show AN-NNN`, `start AN-NNN --owner animatrona-dev`, `note`, `done --summary`. Формат и все
команды: [tasks-per-file](/.claude/docs/tasks-per-file.md).

## Текущий фокус

- **Подготовка к полному перезаливу библиотеки** (вся она помечена `needsReupload`): AN-002
  (верификатор), AN-003 (источник: торрент и magnet), AN-004 (полнота `directoryCid`). Сам
  прогон AN-005 откроется после них и после решений владельца AN-001.
- Мелкое и независимое: AN-016 (тест MiniPlayer), AN-017 (e2e-набор).
- Остальное ждёт владельца: `bun scripts/tasks.mjs waiting animatrona --on kami`.

## Справка (замороженные планы)

Перенесено только живое: открытые пункты `PLAN.md`, раздел «Открытые задачи», перезалив из
`PLAN_ANIMATRONA_ECOSYSTEM.md` §21–§23, открытое из `E2E_PLAN.md`. Остальное остаётся справкой и
расти не может:

- `PLAN.md` (184 КБ), `PLAN_COMPLETED*.md` (девять файлов), `PLAN_TESTING.md` — журнал и
  архивы. Целиком не читать: `grep -n '^## '` и `Read` с `offset`.
- `PLAN_ANIMATRONA_ECOSYSTEM.md` — спецификация (локализация, метаданные, плеер, перезалив),
  `PLAN_FUTURE.md` — старое ТЗ федеративной платформы, `E2E_PLAN.md`, `TASK_TRACKER_SYNC.md` —
  не заморожены. Задачу из них берёшь по `source`.
- `CHANGELOG*.md` целиком не читать: нужная запись ищется `grep`.
- Папочный плеер, IPFS-плеер, лендинг, мобильное приложение, ТВ и трекер — отдельные проекты со
  своими очередями и сессиями.
- Веха стартовала, а задач по ней нет — режь её на задачи через `tasks new … --source`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую задачу.
2. Не делать без слова владельца: `git push`, bump SHA submodule в letar, `bun install` и
   `bun.lock`, релиз и тег, любой запуск массового импорта, перезалива или unpin на рабочей
   библиотеке (перед ним копия `app.db` вместе с `-wal`), правки в чужих `libs/*`.
3. Не править код `animatrona-tracker`, `animatrona-mobile`, `animatrona-tv`: находку
   передавать координатору (`animatrona-coordinator-dev`) через Agent Mail.
4. Один пункт — один коммит в submodule `main`: файлы поимённо, версия в `package.json`, запись в
   `CHANGELOG.md`, перед коммитом `format`, `lint`, `typecheck:tsgo`. Проверка раздачи — через
   внешний гейтвей или вторую ноду, не локальным Kubo.
