---
id: LT-070
title: Ограничить вложенные ожидания остальных hydration helpers
status: ready
size: S
area: testing
priority: 3
blocked_by: []
owner: ""
stage: ""
source: ""
created: 2026-10-17
updated: 2026-10-17
---

## Что и зачем

В `libs/e2e-testing/src/lib/hydration-retry.ts` исправлен `fillWithHydrationRetry`:
вложенный assertion с проектным timeout больше общего `toPass` не оставлял времени
на повторный ввод. Соседние `checkWithHydrationRetry` и
`setInputFilesWithHydrationRetry` всё ещё вызывают действия без короткого timeout;
`toBeChecked` также наследует проектный timeout. Это аналогичный риск, а не доказанное
падение конкретного приложения. Нужна отдельная проверка и минимальное исправление.

## Приёмка

- [ ] Браузерная регрессия воспроизводит потерю первого изменения checkbox при длинном проектном expect timeout.
- [ ] Вложенные actions/assertions оставляют время на повтор; общий бюджет сохранён.
- [ ] Сохранена идемпотентность checkbox и оговорка о disabled file input во время загрузки.
- [ ] Точечные проверки Chromium/WebKit, lint/types библиотеки; документация актуальна.

## План

1. В начале будущей сессии вызвать `time_start({ app: 'letar', description: 'Проверка таймаутов общих E2E-хелперов' })` и зарегистрироваться в Agent Mail.
2. Изучить `libs/e2e-testing/src/lib/hydration-retry.ts`, `fill-stable.ts`, README и `.claude/docs/e2e-testing.md`.
3. Добавить детерминированные браузерные регрессии до исправления; не зависеть от случайной скорости React.
4. Ограничить вложенные операции без общего ослабления утверждений и без безусловных toggle-кликов.
5. Проверить точечно, обновить README/версию/lock и закоммитить только свои файлы.

## Журнал

## Итог
