# Очередь задач Animatrona Folder Player

Проект `animatrona-folder-player`, префикс `FP`. Десктоп-плеер (Electron + Next.js) для просмотра
аниме из обычной папки: внешние ASS и озвучка, «продолжить с места», главы OP/ED, превью на полосе
перемотки. Расширенная поддержка форматов через скачиваемый ffmpeg. Не зависит от
`@letar/animatrona-types`, изолирован.

## Как пользоваться

Задача — один файл `tasks/FP-NNN-slug.md` со статусом в шапке; закрытые лежат в
`tasks/done/ГГГГ-ММ/`. Список собирает команда из корня монорепо:

```bash
bun scripts/tasks.mjs next animatrona-folder-player
```

Дальше: `show FP-NNN`, `start FP-NNN --owner animatrona-folder-player-dev`, `note`,
`done --summary`. Формат и все команды: [tasks-per-file](/.claude/docs/tasks-per-file.md).

## Текущий фокус

- **Переход на движок libmedia** (решение владельца принято, план `PLAN.md` §23): начать с Э0
  (FP-004, риск-гейт `crossOriginIsolated` под `app://`), остальные этапы нарезать после него
  (FP-005). Не удалять ffmpeg раньше Э7.
- **Живая приёмка** (FP-001, FP-002, FP-003) упирается в GUI и реальные файлы, делает владелец.
- Мелкое: FP-010 (лицензия ffmpeg в установщике основного приложения).
- Всё, что ждёт владельца: `bun scripts/tasks.mjs waiting animatrona-folder-player --on kami`.

## Справка (замороженные планы)

Перенесено только живое: открытые `- [ ]` и открытые вопросы `PLAN.md`, ручная проверка из
`PLAN_TESTING.md`. Остальное остаётся справкой и расти не может:

- `PLAN.md` (224 КБ), `PLAN_COMPLETED.md`, `PLAN_TESTING.md` — журнал и архивы. Целиком не
  читать: `grep -n '^### '` и `Read` с `offset`. Решение по движку: §20–§23.
- `CHANGELOG.md` целиком не читать: нужная запись ищется `grep`.
- Локализация, метаданные, лендинг и UX плеера экосистемы — в `apps/animatrona/` (очередь
  `animatrona`, `PLAN_ANIMATRONA_ECOSYSTEM.md`).
- Веха стартовала, а задач по ней нет — режь её на задачи через `tasks new … --source`.

## Правила

1. Нет ответа в планах и решение не твоё — `tasks new … --status blocked --blocked-by "kami: …"`
   и бери следующую задачу.
2. Не делать без слова владельца: `git push`, `bun install` и `bun.lock`, релиз и тег,
   публикация сборки. Правки смежных приложений экосистемы — через `animatrona-coordinator-dev`.
3. GUI в песочнице не проверяется: логику выноси в `shared/` и `main/` чистыми функциями (Vitest
   `renderer/**` не собирает), main-процесс гонять headless (`.claude/rules/electron.md`).
4. Один пункт — один коммит: файлы поимённо, версия в `package.json`, запись в `CHANGELOG.md`,
   перед коммитом `format`, `lint`, `typecheck:tsgo`. Каталог в публичном репозитории: доменов и
   реквизитов в файлах нет.
