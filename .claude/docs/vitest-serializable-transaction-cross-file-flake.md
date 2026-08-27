# Serializable-транзакции в разных spec-файлах — редкий флак под полным прогоном, не гонка за строку

Отдельный класс от [vitest-shared-singleton-row-race.md](/.claude/docs/vitest-shared-singleton-row-race.md):
там гонка — за конкретную singleton-строку, здесь конфликт возникает даже между тестами с полностью
непересекающимися фикстурами (свой `Project`/`ProjectActivity` на каждый тест), потому что причина —
не данные, а сам режим `Serializable`.

## Симптом

`nx test domwellbes -- src/lib/projects/schedule` иногда (не каждый раз, число упавших тестов
плавает 1–5 из 207) падает с Postgres-ошибкой `40001` (`serialization_failure`,
`ERROR: could not serialize access due to read/write dependencies among transactions` /
`Canceled on identification as a pivot`) внутри `recordProjectProgressEvent`
(`progress-event-service.ts`) или другого кода, использующего
`prisma.$transaction(fn, { isolationLevel: Serializable })`. `--fileParallelism=false` —
всегда зелёный (207/207), `nx typecheck:tsgo`/`lint` не ловят вообще.

## Причина

`TransactionIsolationLevel.Serializable` (используется в `approveProjectBaseline`,
`recordProjectProgressEvent`) — это Postgres SSI (Serializable Snapshot Isolation): движок
отслеживает не только реальные конфликты записи, но и **предикатные блокировки** на уровне
диапазонов/индексов, и вправе абортировать транзакцию с `40001` даже при отсутствии пересечения
по конкретным строкам — если несколько параллельных Serializable-транзакций читали/писали через
один и тот же индекс достаточно широким диапазоном (здесь — `activityId`/`stageId`-индексы
`ProjectProgressEvent`/`ProjectMilestoneRmrSnapshot`), это штатное поведение SSI, не баг схемы.

Vitest параллелит **файлы** по воркерам (та же механика, что в соседнем доке про singleton).
Каждый интеграционный spec-файл в `src/lib/projects/schedule/` открывает свои Serializable
транзакции против одной и той же dev-БД. Чем больше файлов одновременно создают/читают
`ProjectProgressEvent` (после появления `rmr-snapshot-service.spec.ts` таких файлов стало
три: `progress-event-service.spec.ts`, `project-schedule.spec.ts`, `rmr-snapshot-service.spec.ts`),
тем выше вероятность, что Postgres сочтёт одну из параллельных транзакций «pivot» и абортирует —
частота флака растёт с числом файлов, а не с объёмом данных одного теста.

## Что НЕ является фиксом

Код приложения не должен молча проглатывать `40001` — это сигнал «повтори транзакцию», и retry
уже реализован там, где конфликт ожидаем в проде (два параллельных клика пользователя,
конкурентный `approveProjectBaseline`). Оборачивать интеграционные тесты в retry-петлю не нужно —
это спрячет реальную регрессию так же, как спрятало бы флак.

## Фикс/обход

Тестам это не мешает быть корректными — `--fileParallelism=false` детерминированно зелёный.
Если флак начинает мешать CI, а не только локальному ручному прогону:

- Ограничить file-параллелизм **только для этой директории** (не для всего `nx test domwellbes`),
  либо
- Свести дублирующиеся Serializable-транзакционные пути тестов к меньшему числу файлов.

На 2026-08-27 решено не трогать глобальный `vitest.config.ts` — частота флака низкая (не каждый
прогон), а принудительный `--fileParallelism=false` замедлил бы весь `nx test domwellbes`, не
только `schedule/`. Если частота вырастет — вернуться к этому файлу.

## Когда применимо

Любой прогон нескольких integration-spec-файлов, каждый из которых открывает
`$transaction(..., { isolationLevel: Serializable })`, на общей dev-БД под vitest file-параллелизмом.
Не специфично для `ProjectProgressEvent`/`ProjectMilestoneRmrSnapshot` — тот же класс сработает
для любых новых Serializable-путей в этом каталоге.
