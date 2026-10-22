---
id: SY-002
title: Инлайн-стили кнопок студии перевести на button-style.ts
status: ready
size: S
area: refactor
priority: 4
blocked_by: []
owner: ""
stage: ""
source: PLAN.md «Техдолг (мелкий, не блокирующий)»
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

`studio-client.tsx` (шапка: SUB/FM/DRUM, запись, рендер WAV, VJ) и `vj-overlay.tsx` (константа `buttonStyle` для тумблеров) пишут инлайновые `style={{…}}` вместо общих хелперов `filledToggleStyle` и `outlineButtonStyle` из `_components/studio/button-style.ts`. Переводить при следующем касании этих файлов.

## Приёмка

- [ ] Шапка студии и VJ-оверлей используют общие хелперы
- [ ] Внешний вид не изменился

## План

## Журнал

## Итог
