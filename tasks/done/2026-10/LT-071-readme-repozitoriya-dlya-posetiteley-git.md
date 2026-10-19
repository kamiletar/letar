---
id: LT-071
title: README репозитория для посетителей GitHub
status: done
size: S
area: docs
priority: 3
blocked_by: []
owner: ""
stage: ""
source: ""
created: 2026-10-19
updated: 2026-10-19
closed: 2026-10-19
---

## Что и зачем

Корневой README был описью папок для того, кто уже внутри: первым делом сообщал о недоступных
приватных проектах, не показывал главное (формы из схемы, работа ИИ-агентов), а «быстрый старт»
у постороннего падал на SSH-клоне и приватных submodules. Владелец попросил переписать его для
людей, которые приходят в репозиторий с GitHub.

## Приёмка

## План

## Журнал

## Итог

README.md переписан для посетителей: три входа (формы / ИИ-агенты / автор), пример zmodel → Form.FromSchema со скриншотом (.github/assets/forms-auto-fields.png, снят Playwright-скриптом с forms-example /examples/auto-fields), раздел о работе агентов со схемой mermaid и пятью разборами, живые ссылки на открытые приложения, запуск по HTTPS без приватных submodules. README.en.md — полный перевод. На GitHub заполнены описание, homepage (forms.letar.best) и 20 topics. Коммиты 2c51ae667, f89d35aab, запушены. Замечено: на /examples/zenstack у forms-example визуальные дефекты (Status «D R A F T», съехавшая подпись Rating, «Tags*» без пробела), у сайта нет тёмной темы.
