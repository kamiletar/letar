---
id: LT-088
title: Устранить оставшиеся lint и test сбои после LT-086
status: ready
size: M
area: quality
priority: 2
blocked_by: []
owner: ""
stage: ""
source: LT-086
created: 2026-11-21
updated: 2026-11-21
---

## Что и зачем

Оставшиеся сбои общих проверок LT-086 требуют отдельных исправлений. Новые
регрессии зависимостей нельзя объявлять исключёнными только по существованию старого долга;
проверять причины и минимальное воспроизведение каждого оставшегося сбоя.

## Приёмка

- Lint mcp-server-kit: убрать unsafe optional chaining в secret-http-client.spec.ts:40.
- Lint kami-e2e: убрать irregular whitespace в тесте (точный файл — лог LT-086).
- Studio: проверить миграцию ReferralAgent.poolBps в изолированной тестовой БД,
  не применять db:push к пользовательским данным ради зелёного прогона.
- Studio: обновить моки webhook-тестов Alfa/Tochka под зависимости текущих обработчиков.
- Проверки проходят отдельно и в общем прогоне.
- Renderer Animatrona: устранить конфликт references и .next/types (TS6305),
  чтобы typecheck проходил с сохранёнными сгенерированными типами Next.

## План

Разнести исправления по владельцам проектов, проверить воспроизведение до обновления
зависимостей там, где причина неочевидна. При расширении объёма разделить задачу.

## Журнал

- 2026-11-21: общий lint (148 проектов) — mcp-server-kit:oxlint, kami-e2e:lint.
- Studio: отсутствует ReferralAgent.poolBps. Отдельный повтор пяти остальных файлов:
  32 теста прошли, три webhook-теста упали (undefined.findUnique в моках).
- Vue/Vue Shadcn: тесты lazy RichText/DataGrid упали при общей нагрузке,
  оба набора прошли отдельно. Хелперы ждут фиксированные 500 мс; при стабилизации
  заменить ожидание условием фактической готовности элемента, не увеличивать таймер вслепую.
- Логи: .claude/artifacts/deps-nov21-lint.log, deps-nov21-tests-final.log,
  .nx/cache/terminalOutputs/7635961794122726352 (отдельный Studio-повтор).
- Domwellbes: 434 файла / 3047 тестов прошли, один тест proposal-access-grant
  превысил 5 секунд, затем очистка встретила FK ProposalEvent. Отдельный повтор файла прошёл.
- Renderer: исходники проверены успешно после временного переноса .next/types;
  артефакты возвращены на место, проблема конфигурации references остаётся.
- Повтор build: kami-key-the — неверный префиксный alias @letar/hooks/browser
  резолвится как libs/hooks/src/index.ts/browser; dsperevod — AggregateError БД при
  collect configuration /api/admin/consents-export. Оба проекта уже перечислены
  в более ранней LT-079; актуальные логи — deps-nov21-build-remaining.log.

## Итог
