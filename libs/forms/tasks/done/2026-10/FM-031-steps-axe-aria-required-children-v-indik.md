---
id: FM-031
title: "Steps: axe aria-required-children в индикаторе шагов checkout"
status: done
size: S
area: a11y
priority: 2
blocked_by: []
owner: TurquoiseFinch
stage: Браузерная приёмка гостевого checkout aboi
source: "aboi AB-016, store-acceptance.spec.ts: гостевой checkout"
created: 2026-10-23
updated: 2026-10-23
closed: 2026-10-23
---

## Что и зачем

В гостевом checkout aboi стандартный `Form.Steps.Indicator` нарушает axe
`aria-required-children` (critical) на обоих устойчивых шагах. Chakra/Ark задаёт
`aria-current="step"` элементу Item внутри `role="tablist"`: доступная обёртка
становится запрещённым дочерним узлом списка вкладок.

## Приёмка

- [x] У обёрток вкладок presentation, отсутствует aria-current; актуальный шаг объявлен aria-selected.
- [x] В linear/clickable=false вкладки и связи панелей существуют, переход по вкладкам заблокирован.
- [x] Регрессии структуры, клавиатуры и линейной валидации проходят.
- [x] Гостевой checkout проходит реальный axe-аудит в браузерах.

## План

1. Воспроизвести axe на минимальной исходной структуре.
2. Удалить aria-current на конечном DOM-элементе Item, сохранить стандартные Chakra slots.
3. Для статического индикатора сохранить disabled Trigger вместо отсутствующих tabs.
4. Проверить структуру, Enter/клик, обязательные поля и гостевой checkout.

## Журнал

- 2026-10-23: делегировано aboi-dev по form-delegation. Координатор forms-coordinator-dev retired;
  отдельная identity TurquoiseFinch, резерв точных файлов, без восстановления чужой identity.
- Actual axe 4.14 в Chromium, setContent исходного tablist: critical, «Element has children
  which are not allowed: div[aria-current]». Только role=presentation не исправляет:
  «presentational children cannot be ignored because of [aria-current]». Удаление aria-current
  и presentation дают 0 нарушений aria-required-children на той же структуре.
- Пользовательский aria-current=undefined не удаляет атрибут после Ark merge (подтверждено
  регрессионным тестом). Локальный PresentationalStepItem отбрасывает атрибут перед DOM.
- Проверены применимость всех групп forms-dev: новый компонент/API/сценарий не добавляется,
  поэтому новые demo, showcase, guide, API reference и NEW_COMPONENTS не нужны; существующие
  потребители получают исправление автоматически. Группы 2–5: без изменений по этой причине.
  Группа 1: исходник, регрессии, версия/CHANGELOG после завершения параллельной приёмки aboi.
  Группа 6: итог передаётся родительскому aboi-dev через канал делегации.
- Nx test каталога form-steps: 5 файлов / 50 тестов PASS, из них 7 новых регрессий.
  Nx lint + typecheck:tsgo PASS; 6 существующих lint-предупреждений в других файлах.
  Scoped dprint fmt/check исходника и spec PASS. В итоговом diff библиотеки чужих правок нет.
- После проверки локального Chakra-правила композиция переведена на `Steps.Item asChild`:
  DOM-адаптер сохраняет presentation и удаление aria-current, запрещённый проп as не используется.
  Повторные 7 регрессий PASS. Actual axe на SSR-разметке импортированного настоящего
  FormStepsIndicator в Chromium: 0 нарушений aria-required-children, aria-required-parent,
  aria-valid-attr-value во всех трёх режимах (обычный, linear, clickable=false).

## Итог

Каталог form-steps: 5 файлов, 50 тестов проходят (в том числе 7 новых регрессионных
проверок); lint/typecheck проходят. Исправлено в версии 3.0.2; итоговая браузерная
приёмка гостевого checkout выполняется aboi-dev отдельно от unit-проверок библиотеки.
Исправлено дерево ARIA Steps; 50 unit и axe, гостевое оформление aboi в Firefox проходит
