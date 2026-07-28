# План тестирования — Animatrona

## Статистика

| Тип  | Количество | Статус      |
| ---- | ---------- | ----------- |
| Unit | 0          | Планируется |
| E2E  | 0          | Планируется |

## Запуск тестов

```bash
nx test animatrona
nx e2e animatrona-e2e
```

## План по фазам

### Фаза 1: Базовые тесты

- [ ] Базовая функциональность

### Фаза 2: Импорт

- [x] `apps/animatrona-e2e/src/03-import/rutracker-import.electron.spec.ts` — импорт из Rutracker
      (`ImportRutrackerContent`): навигация на вкладку, disabled-состояние кнопки "Парсить",
      детерминированный экран ошибки при недоступном Shikimori API (сеть к shikimori.io/shikimori.one
      блокируется через `session.webRequest.onBeforeRequest` в main-процессе, т.к. `page.route()`
      не перехватывает `net.fetch` из main). Happy-path (успешный Shikimori-матч → шаг preview)
      НЕ покрыт — нужен dedicated test-mode hook для подмены ответа GraphQL/REST в main-процессе,
      см. комментарий в конце spec-файла.

---

**Последнее обновление:** 2026-07-28
