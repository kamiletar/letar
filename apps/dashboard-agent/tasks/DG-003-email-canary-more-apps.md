---
id: DG-003
title: Распространить канарейку доставки email на другие приложения со своим SMTP
status: blocked
size: M
area: monitoring
priority: 4
blocked_by:
  - "kami: решение: для каких приложений"
owner: ""
stage: ""
source: PLAN.md «Backlog» → открытый вопрос про канарейку email
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

По образцу проверки для domwellbes (`getAppSmtpConfig` готов, `waitForCanaryMessage` переиспользуем; секреты 15 приложений уже смонтированы в `/secrets/<app>.env`). Кандидаты со своим SMTP: driving-school, aboi, svoichuzhie (dsperevod на другом транспорте и имеет свою проверку). Каждая проверка — новый служебный ящик на Maddy и новый секрет в `.env.docker.enc`. Заведено под конкретный инцидент, не как общая инициатива.

## Приёмка

- [ ] Решение, для каких приложений нужна
- [ ] Ящики и секреты заведены, проверки включены

## План

## Журнал

## Итог
