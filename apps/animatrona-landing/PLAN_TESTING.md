# План тестирования — Animatrona Landing

## Статистика

| Тип  | Количество | Статус                |
| ---- | ---------- | --------------------- |
| Unit | 0          | Планируется           |
| E2E  | 14         | Готово (базовый сьют) |

## Запуск тестов

```bash
# Unit тесты
nx test animatrona-landing

# E2E тесты (если есть)
nx e2e animatrona-landing-e2e
```

## План по фазам

### Фаза 1 — Базовые тесты

- [x] Тест рендеринга главной страницы (`apps/animatrona-landing-e2e/src/homepage.spec.ts`)
- [x] Тест навигации между секциями и документацией (`apps/animatrona-landing-e2e/src/navigation.spec.ts`)
- [x] Тест mobile menu и отсутствия horizontal overflow (`apps/animatrona-landing-e2e/src/mobile.spec.ts`)

### Фаза 2 — Интеграционные тесты

- [ ] Тест интеграции с GitHub API (releases)
- [ ] Тест определения платформы пользователя

### Фаза 3 — E2E тесты

- [ ] Полный user flow: landing → download
- [ ] Тест на мобильных устройствах (responsive)
- [ ] Accessibility тесты (axe-core)

---

**Последнее обновление:** 2026-07-18 — добавлен базовый e2e-сьют (`apps/animatrona-landing-e2e`, 14 тестов: главная, навигация/документация, мобильная адаптивность). Первый шаг перед подключением к staging-гейту (см. `PLAN.md` летар §18.7).
