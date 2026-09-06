# План разработки kami-key-the-landing

## Текущий статус: v0.3.0 — Первый релиз на скачивание

### Планируется

- [ ] Страница/секция с ченджлогом релизов (запрос владельца, 2026-09-06) — источник данных:
      GitHub Releases `kamiletar/letar` с тегом `kami-key-the-v*` (уже используется как хостинг
      .exe, см. «Сделано» ниже). Варианты: серверный fetch GitHub Releases API на билде/ISR,
      либо ручное ведение markdown-файла в репо. Не решено, какой — на усмотрение при реализации.
- [ ] Аудит `_active: scale()` в теме на `pressScale` (`@letar/ui`) — задача описана в
      [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md)
- [ ] Заменить `transition="all ..."` на явный `transitionProperty` (сужает анимацию до реально
      меняющихся свойств вместо любого изменения пропа при ре-рендере) — найдено 7 мест в
      `src/app/_components/downloads-section.tsx`, `faq-section.tsx`, `features-section.tsx`,
      `hero-section.tsx` (×2), `navbar.tsx` (×2). Паттерн фикса и разбор — в
      [interactive-press-feedback.md](/.claude/docs/interactive-press-feedback.md)
- [ ] Дизайн и контент лендинга
- [ ] Адаптивная верстка
- [ ] SEO оптимизация

### Сделано

- [x] Секция «Скачать» и hero-бейдж версии переведены с заглушки на реальный релиз —
      `kami-key-the-v1.7.2` на GitHub Releases (`kamiletar/letar`). Версия/размер вынесены в
      общий модуль `src/app/_components/download-info.ts`, обновлять вручную при каждом
      следующем релизе. Хостинг — GitHub Releases (тот же паттерн, что уже был задуман для
      `animatrona`/`label-printer-desktop`, но ни разу не использован ими на практике — этот
      релиз первый в репозитории).
- [x] Базовый E2E-сьют (`apps/kami-key-the-landing-e2e`) — 8 тестов Playwright: загрузка главной,
      навигация, CTA "Скачать для Windows", секции "Возможности"/"Скачать", FAQ-аккордеон, футер,
      health-check, 404 на несуществующем маршруте. Нужен для тиража staging-e2e-гейта (PLAN.md
      §18.7 корневого репо).

## Техдолг: подключить theme:check

Гейт сырых цветов/теней/transition в UI-коде (`nx g @letar/generators:theme-check-integrate
kami-key-the-landing`, генератор `libs/generators`, обёртка над `@letar/theme-check`) пока не
подключён. Уже подключено: domwellbes, studio, aboi. Подключать по одному, не пакетно —
allowlist легитимных исключений собирается руками при первом прогоне. Разбор —
`.claude/docs/theme-hardcode-gate-coverage.md`.
