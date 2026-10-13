---
id: FM-020
title: "Field.Password: кнопка показа пароля ≥44px на touch"
status: done
size: S
area: ""
priority: 2
blocked_by: []
owner: forms-dev
stage: ""
source: тред forms-number-touch-targets (domwellbes DW-017)
created: 2026-10-13
updated: 2026-10-13
closed: 2026-10-13
---

## Что и зачем

Заявка domwellbes-dev: кнопка «Toggle password visibility» в `Field.Password` на Android 36×32 px. Нужно ≥44×44 при `pointer: coarse`, как сделано для степперов в FM-019. Используют sign-in, sign-up, forgot-password.

## Приёмка

- Кнопка 44×44 на touch, на десктопе вид прежний.
- Тест, демо, CHANGELOG, версия; проверка в браузере на 392 px.

## План

## Журнал

## Итог

Кнопка показа пароля 44×44 на pointer: coarse (touchIconButtonCss), степперы NumberInput/Currency/Percentage — как у Number (numberTouchControlsCss), общий хелпер base/touch-targets.ts. Проверено в браузере на 392 px: все триггеры и кнопка пароля 44×44, scrollWidth=clientWidth. Duration не менял. forms 2.39.1; nx test forms 151 файл, 1124 теста зелёные.
