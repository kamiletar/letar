# План тестирования — Animatrona Tracker

## Статистика

| Тип         | Количество | Статус      |
| ----------- | ---------- | ----------- |
| Unit        | 0          | Планируется |
| Integration | 0          | Планируется |
| E2E         | 0          | Планируется |

## Запуск тестов

```bash
# Unit/Integration тесты
nx test animatrona-tracker

# E2E тесты
nx e2e animatrona-tracker-e2e

# Линтинг
nx lint animatrona-tracker

# Проверка типов
nx typecheck:tsgo animatrona-tracker
```

## План по фазам

### Фаза 1: Unit тесты

- [ ] IPFS CID валидация
- [ ] API Key генерация/валидация
- [ ] Фильтры каталога

### Фаза 2: Integration тесты

- [ ] API публикации аниме
- [ ] API получения списка
- [ ] Access control policies

### Фаза 3: E2E тесты

- [ ] Регистрация/авторизация (OAuth mock)
- [ ] Просмотр каталога
- [ ] Создание API ключа
- [ ] Модерация контента

## Особенности тестирования

### IPFS интеграция

Для тестирования IPFS-зависимого функционала:

- Mock IPFS Gateway для unit тестов
- Локальный IPFS node для integration тестов

### OAuth

- Mock Better Auth для unit/integration
- storageState для E2E (авторизованные сценарии)

---

**Последнее обновление:** 2026-03-19
