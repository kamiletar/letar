# План разработки — Animatrona Landing

## Текущие задачи

### В процессе

- [ ] Интеграция с реальными скриншотами приложения
- [ ] Добавление видео-демо в Hero секцию

### Запланировано

- [ ] Аудит `_active: scale()` в теме на `pressScale` (`@letar/ui`) — задача описана в
      [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md)
- [ ] Страница с документацией (подроуты)
- [ ] Блог с обновлениями
- [ ] Интеграция аналитики (Yandex Metrika / Plausible)
- [ ] SEO оптимизация (meta tags, Open Graph)
- [ ] Локализация (ru/en)

## Завершённые задачи

Выполненные задачи см. в [PLAN_COMPLETED.md](./PLAN_COMPLETED.md).

## Техдолг: `as=` на Chakra-компонентах — Box/Heading/Text (не Icon)

`<Icon as={IconComponent}>` уже почищен (см. PLAN_COMPLETED.md, 2026-08-26). Semgrep
(`letar-chakra-as-prop-forbidden`, `.semgrep/letar-rules.yml`, WARNING) всё ещё даёт **49**
срабатываний в этом приложении на другой формой того же паттерна: `Box as="section"`,
`Heading as="h1"/"h2"/"h3"`, `Text as="span"`, `Box as="nav"/"footer"/"button"` — в т.ч. в
файлах вне списка прошлой сессии (`footer.tsx`, `app-showcase-section.tsx`,
`import-flow-section.tsx`, `docs/encoding-profiles/page.tsx`,
`docs/keyboard-shortcuts/page.tsx`). Разбор на `asChild` + нативный тег — отдельная задача;
семантические `Heading as="h1"` требуют аккуратности, чтобы не потерять уровень заголовка при
замене. Не блокирует pre-commit (WARNING), но входит в общую цель §61 корневого `PLAN.md`
(полная чистка `apps/*` перед возвратом правила к ERROR).

- [ ] Почистить оставшиеся 49 `as=` (Box/Heading/Text/Link) на Chakra-компонентах в
      `apps/animatrona-landing`

## Техдолг: подключить theme:check

Гейт сырых цветов/теней/transition в UI-коде (`nx g @letar/generators:theme-check-integrate
animatrona-landing`, генератор `libs/generators`, обёртка над `@letar/theme-check`) пока не
подключён. Уже подключено: domwellbes, studio, aboi. Подключать по одному, не пакетно —
allowlist легитимных исключений собирается руками при первом прогоне. Разбор —
`.claude/docs/theme-hardcode-gate-coverage.md`.

---

**Последнее обновление:** 2026-01-10
