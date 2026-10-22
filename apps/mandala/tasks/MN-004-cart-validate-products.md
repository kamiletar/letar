---
id: MN-004
title: "Корзина: проверять товары из localStorage против БД"
status: ready
size: S
area: cart
priority: 3
blocked_by: []
owner: ""
stage: ""
source: PLAN.md, «Активные и отложенные задачи»
created: 2026-10-22
updated: 2026-10-22
---

## Что и зачем

Позиция с несуществующим `productId` (товар удалён или сменился) тихо остаётся в корзине «призраком». Найдено 2026-08-13 при отладке e2e (`04-checkout.guest.spec.ts`). Проверять существование товара при чтении корзины: `apps/mandala/src/app/[locale]/(main)/cart/_components/cart-items.tsx` и хук `useCart`.

## Приёмка

- [ ] Несуществующие позиции убираются с сообщением
- [ ] Тест

## План

## Журнал

## Итог
