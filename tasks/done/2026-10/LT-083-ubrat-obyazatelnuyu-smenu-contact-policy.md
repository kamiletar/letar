---
id: LT-083
title: Настроить open по умолчанию на сервере Agent Mail
status: done
size: S
area: tooling
priority: 3
blocked_by: []
owner: ""
stage: ""
source: "Kami: повторяющиеся отказы автопроверки в каждом чате"
created: 2026-10-26
updated: 2026-10-26
closed: 2026-10-26
---

## Что и зачем

## Приёмка

## План

## Журнал

## Итог

По поручению Kami default Agent.contact_policy изменён с auto на open на сервере Agent Mail; контейнер перезапущен и healthy. С отдельным подтверждением владельца 168 auto проекта c-web-letar переведены в open; 8 block_all и другие проекты сохранены. Перед миграцией создан SQLite backup в /data/backups/. Добавлены идемпотентный патч, Dockerfile на текущем upstream digest и 3 изолированных теста (все прошли). Образ letar/agent-mail:open-default собран для пересоздания; рабочий контейнер пропатчен без пересоздания. Общие правила и 6 скиллов больше не требуют set_contact_policy при старте. Документация обновлена.
