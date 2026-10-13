---
id: FM-006
title: "EditIntent: чувствительные поля в analytics и offline-очереди"
status: done
size: M
area: security
priority: 3
blocked_by: []
owner: forms-dev
stage: ""
source: libs/forms/PLAN.md «Отложено (решение владельца 2026-09-19)»
created: 2026-10-12
updated: 2026-10-13
closed: 2026-10-13
---

## Что и зачем

Реестр чувствительных полей не подключён к analytics-адаптерам и offline-очереди. Сначала проверить, шлют ли они значения полей. Если шлют, секрет из `EditIntent` может туда попасть, и пункт поднимается до P1. Вместе с этим закрыть пробелы UI-тестов `EditIntent`: disabled/loading, reset после success, серверная ошибка на `${name}.value`, клавиатура и подписи для скринридера. Владелец 2026-09-19 отложил этот пункт («на потом»), но проверка утечки дешёвая и ответит, нужен ли P1.

## Приёмка

- [ ] Проверено, уходят ли значения чувствительных полей в analytics и offline (результат в журнал)
- [ ] Если уходят: исправлено и приоритет поднят
- [ ] Пробелы UI-тестов закрыты

## План

## Журнал

- 2026-10-13: Проверка утечки 2026-10-13. Analytics: события (forms-core/analytics/types.ts) несут только имена полей, время и счётчики; значений нет. field_error.error — строка от вызывающего trackError, библиотека её сама не шлёт (useFormAnalytics нигде не подключён внутри libs). Утечки нет. Offline: use-offline-form.ts:78 кладёт payload: value (весь submit) в IndexedDB через useSyncQueue.addAction; реестр чувствительных путей (useSensitiveFieldPaths) в offline не читается — у persistence фильтр omitAtPaths есть (use-form-features.ts:100,224), у offline нет. Реестр наполняет только EditIntent (sensitive по умолчанию true) => секрет из EditIntent при офлайн-сабмите лежит в IndexedDB открытым текстом. ЕСТЬ УТЕЧКА (at-rest), приоритет поднимается до P1; вопрос к координатору: как чинить (вырезать значение и потерять при синке, шифровать, или не ставить в очередь формы с чувствительными полями).

## Итог

Утечка проверена: analytics чист (значений в событиях нет); offline-очередь писала секрет EditIntent в IndexedDB открытым текстом — исправлено вариантом 2 (решение координатора): форма с чувствительными полями без сети не ставится в очередь, OfflineSensitiveFieldsError + код sensitive-fields-offline, текст ru/en через formOffline.sensitiveFieldsOffline, форма не сбрасывается и не бросает. forms 2.39.2, forms-core 0.29.1. Пробелы UI-тестов EditIntent закрыты (disabled, состояние после отправки, серверная ошибка на apiKey.value, клавиатура и подписи); loading-состояния у компонента нет — тестировать нечего. Приоритет задачи был поднят до P1.
