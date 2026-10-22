---
id: MB-001
title: Сборка armeabi-v7a на Windows ломается лимитом длины пути
status: ready
size: S
area: build
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN.md «Черновик», открытый вопрос про armeabi-v7a
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Ninja не может разместить codegen-объект `react-native-gesture-handler` в `.cxx/Debug/<hash>/armeabi-v7a/…`: путь репозитория `C:\web\letar\…` слишком длинный (лимит 260 символов). К версии react-native не относится. Решение выбрать: короткий путь сборки (junction или subst), смена каталога `.cxx` либо включение длинных путей Windows.

## Приёмка

- [ ] Выбран способ обхода
- [ ] Сборка `armeabi-v7a` проходит на Windows

## План

## Журнал

## Итог
