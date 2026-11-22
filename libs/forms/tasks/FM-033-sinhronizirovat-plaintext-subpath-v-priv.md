---
id: FM-033
title: Синхронизировать PlainText subpath в приватных потребителях
status: blocked
size: S
area: ""
priority: 2
blocked_by:
  - "consumer-agents: добавить paths и закоммитить в своих submodule"
owner: ""
stage: ""
source: "FM-030: локальный lib-subpath-paths после публичного выпуска forms3.1.1"
created: 2026-11-22
updated: 2026-11-22
---

## Что и зачем

После выпуска forms 3.1.1 публичные потребители получили alias `@letar/forms/plain-text`.
Локальный lib-subpath-paths нашёл ещё восемь tsconfig в приватных submodule без этого
подпути. Их владельцы добавляют alias сами и коммитят изменения внутри submodule;
координатор не включает чужую незавершённую работу в релиз.

## Приёмка

- Во всех восьми tsconfig добавлен `@letar/forms/plain-text` рядом с rich-text, путь
  ведёт к `libs/forms/src/entries/plain-text.ts` с корректной относительной глубиной.
- Коммиты submodule отправлены, gitlink и lock согласованы в root отдельными коммитами.
- `node scripts/check-lib-subpath-paths.mjs` не сообщает о пропущенном PlainText.

## План

## Журнал

## Итог
