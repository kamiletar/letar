# Grand Slam Cup — План тестирования

## Статистика

| Тип  | Количество | Статус    |
| ---- | ---------- | --------- |
| Unit | 0          | Ожидает   |
| E2E  | 28         | Завершено |

## Запуск тестов

```bash
nx test grandslamcup                          # Unit тесты
nx e2e grandslamcup-e2e -- --project=chromium  # E2E тесты
```

## E2E тесты — покрытие (v1.7.0+)

Auth: `/api/auth/dev-session` (dev-only endpoint, заблокирован в production).

| Файл                       | Кол-во | Покрытие                                       |
| -------------------------- | ------ | ---------------------------------------------- |
| `01-public.spec.ts`        | 10     | Главная, логотип, секции, навигация            |
| `02-standings.spec.ts`     | 6      | Round-Robin, Swiss W-L, badge, переключение    |
| `03-admin.spec.ts`         | 8      | Auth redirect, дашборд, sidebar, CRUD страницы |
| `04-teams-players.spec.ts` | 4      | Профили команд, поэты, расписание              |
| **Итого**                  | **28** | Публичные + admin + auth                       |

## План — Unit тесты (ожидает)

### Фаза 1 — Базовые тесты

#### Unit (Vitest)

- [ ] Авторизация: getSession, getCurrentUser, requireAuth
- [ ] Компоненты: SignInPage рендерится корректно

### Фаза 2 — Live Scoring

#### Unit (Vitest)

- [ ] `scoring.ts`: calculateAdjusted — 5 оценок → drop max/min → sum 3
- [ ] `scoring.ts`: calculateAdjusted — все одинаковые оценки
- [ ] `scoring.ts`: calculateAdjusted — edge cases (менее 5 оценок → null)
- [ ] `scoring.ts`: calculateTotal — текст + подача
- [ ] `scoring.ts`: isValidScore — граничные значения (0, 1, 5, 6)
- [ ] `match-state.ts`: getMatchState создаёт дефолтное состояние
- [ ] `match-state.ts`: updateMatchState мутирует состояние
- [ ] `match-state.ts`: removeMatchState очищает

#### Integration

- [ ] `scorer.action.ts`: startMatchAction меняет статус SCHEDULED → LIVE
- [ ] `judge.action.ts`: submitVoteAction — unique constraint на повторное голосование
- [ ] `judge.action.ts`: registerJudgeAction — лимит 5 судей

---

**Последнее обновление:** 2026-04-08
