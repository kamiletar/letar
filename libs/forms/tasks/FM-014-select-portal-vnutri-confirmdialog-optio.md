---
id: FM-014
title: "Select Portal внутри ConfirmDialog: option недоступны (aria-hidden/inert), FL-034"
status: ready
size: M
area: ""
priority: 2
blocked_by: []
owner: ""
stage: ""
source: тред flora-fl-034-select-modal (от flora-dev-refusal)
created: 2026-10-13
updated: 2026-10-13
---

## Что и зачем

Запросил `flora-dev-refusal` (FL-034 в `apps/flora/tasks/`, не блокирует FL-026). В jsdom с
ChakraProvider и настоящим `FloraForm.Field.Select` внутри `ConfirmDialog` список открывается, но
Testing Library не находит доступные `option`: Portal списка вне модального окна, область скрыта
через `aria-hidden`/`inert`. В браузере не подтверждено.

Сделать: воспроизвести в браузере (мышь, клавиатура, доступность). Если дефект настоящий —
исправить Portal/focus trap в `uikit-chakra.tsx` (Portal около строки 362) и `field-select.tsx`.
Если только jsdom — зафиксировать правильный способ регрессионной проверки без обхода hidden.
Пример: `ConfirmDialog open`, в `description` форма с `Field.Select` из двух опций. Диалог —
`libs/ui/src/lib/confirm-dialog.tsx`.

## Приёмка

- Вердикт «браузер / только jsdom» записан в журнале.
- Баг: выбор option мышью и клавиатурой в диалоге работает, есть тест.
- Только jsdom: рецепт проверки в доках, тест во flora без обхода hidden.
- После — ответить в тред `flora-fl-034-select-modal`.

## План

## Журнал

## Итог
