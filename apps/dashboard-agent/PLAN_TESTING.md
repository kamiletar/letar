# План тестирования — Dashboard Agent

## Статистика

| Тип         | Количество | Статус      |
| ----------- | ---------- | ----------- |
| Unit        | 0          | Планируется |
| Integration | 0          | Планируется |

## Запуск тестов

```bash
# Unit тесты
nx test dashboard-agent

# Линтинг
nx lint dashboard-agent

# Проверка типов
nx typecheck dashboard-agent
```

## План по фазам

### Фаза 1: Unit тесты

- [ ] Парсинг метрик CPU
- [ ] Парсинг метрик памяти
- [ ] Форматирование ответов API

### Фаза 2: Integration тесты

- [ ] Fastify endpoints
- [ ] Docker API (mock)
- [ ] PostgreSQL connection (mock)

### Фаза 3: E2E тесты

- [ ] Полный цикл сбора метрик
- [ ] Отправка в Dashboard (mock)

## Особенности тестирования

### Системные метрики

- Mock systeminformation для стабильных тестов
- Фиксированные значения для assertions

### Docker

- Mock dockerode
- Тестовые данные контейнеров

### PostgreSQL

- Mock pg client
- Тестовые данные баз

---

**Последнее обновление:** 2026-02-02
