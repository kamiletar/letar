---
id: TM-001
title: Проверить результат передеплоя time после фиксов smoke-test
status: ready
size: S
area: release
priority: 2
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, раздел «Деплой», открытый вопрос
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Deploy-request на передеплой (коммит `51465453`, thread `deploy-time`) отправлен `deploy-agent-dev` 2026-09-04. Сверить `fetch_inbox` или `search_messages` по треду и `deploy_status`: прошёл ли rollout целиком, включая smoke-test. Если не прошёл, искать ещё одну утилиту, отсутствующую в `node:24-slim` (тот же класс бага дважды всплывал).

## Приёмка

- [ ] Rollout `time` на проде завершён
- [ ] Если нет, причина найдена и починена

## План

## Журнал

## Итог
