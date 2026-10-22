---
id: TM-004
title: Мультиязычность на 40 языков и библиотека number-words
status: idea
size: L
area: i18n
priority: 4
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, «Мультиязычность — 40 языков»
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Не начато. Фаза 1: публикуемая библиотека `@letar/number-words` (`libs/number-words`, движок `to-words`, кардинальные и порядковые числительные, тесты на все языки, README, публикация в npm только по слову владельца). Фаза 2: 38 файлов `messages/{locale}.json` (ru и en есть), plural rules ICU, `routing.ts` и `generateStaticParams` на 40 локалей. Фаза 3: замена `number-to-words` и `numeralize-ru` на новую библиотеку, удаление хардкода `locale === 'ru'`. Фаза 4: RTL для ar, fa, he, ur, селектор языка по регионам, cookie и автодетект Accept-Language. Фаза 5: тесты, визуальная проверка, e2e переключения. Резать на задачи по фазам, когда решим начинать.

## Приёмка

- [ ] Решение, начинаем ли
- [ ] Нарезка на фазы-задачи

## План

## Журнал

## Итог
