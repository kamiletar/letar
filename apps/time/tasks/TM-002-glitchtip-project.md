---
id: TM-002
title: "GlitchTip для time: создать проект и прописать DSN"
status: blocked
size: S
area: observability
priority: 3
blocked_by:
  - "kami: создать проект time в GlitchTip и дать DSN"
owner: ""
stage: ""
source: PLAN.md, «Инфраструктура», пункт GlitchTip
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Код подключён 2026-08-11 (`nx g @letar/generators:glitchtip-integrate time`), но проекта `time` в GlitchTip нет. Дальше: создать проект, вписать DSN в `.env.docker` и `.env.staging` (`NEXT_PUBLIC_*` значение должно лежать в `.env.docker` до сборки), зашифровать через `scripts/sops-env-set.sh`, затем заявка `deploy-agent-dev`.

## Приёмка

- [ ] Проект создан, DSN прописан
- [ ] Тестовая ошибка видна в GlitchTip

## План

## Журнал

## Итог
