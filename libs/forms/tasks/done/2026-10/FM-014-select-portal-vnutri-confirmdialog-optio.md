---
id: FM-014
title: "Select Portal внутри ConfirmDialog: option недоступны (aria-hidden/inert), FL-034"
status: done
size: M
area: ""
priority: 2
blocked_by: []
owner: forms-dev
stage: ""
source: тред flora-fl-034-select-modal (от flora-dev-refusal)
created: 2026-10-13
updated: 2026-10-13
closed: 2026-10-13
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

Дефект настоящий и в браузере: positioner списка в Portal получал aria-hidden от модального диалога (мышью выбор работал, скринридер и getByRole('option') опций не видели). Фикс: lazyMount + unmountOnExit у Select.Root в uikit-chakra.tsx. Тест field-select-in-dialog.spec.tsx (3 теста, красные без фикса), демо /confirm-dialog-select, рецепт в docs/fields.md. Combobox/Autocomplete воспроизводятся так же: FM-015, CascadingSelect/DateRange: FM-016. Клавиатуру в живом браузере не гонял (панель скрыта), только в jsdom.
