# План разработки kami-key-the-landing

## Текущий статус: v0.1.0 — Начальная версия

### Планируется

- [ ] Аудит `_active: scale()` в теме на `pressScale` (`@letar/ui`) — задача описана в
      [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md)
- [ ] Дизайн и контент лендинга
- [ ] Адаптивная верстка
- [ ] SEO оптимизация

### Сделано

- [x] Базовый E2E-сьют (`apps/kami-key-the-landing-e2e`) — 8 тестов Playwright: загрузка главной,
      навигация, CTA "Скачать для Windows", секции "Возможности"/"Скачать", FAQ-аккордеон, футер,
      health-check, 404 на несуществующем маршруте. Нужен для тиража staging-e2e-гейта (PLAN.md
      §18.7 корневого репо).
