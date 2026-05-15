# План тестирования — Animatrona Mobile

## Статистика

| Тип         | Количество | Статус      |
| ----------- | ---------- | ----------- |
| Unit        | 0          | Планируется |
| Integration | 0          | Планируется |
| E2E         | 0          | Планируется |

## Запуск тестов

```bash
# Unit/Integration тесты
nx test animatrona-mobile

# Линтинг
nx lint animatrona-mobile

# Проверка типов
nx typecheck animatrona-mobile
```

## План по фазам

### Фаза 1: Unit тесты

- [ ] API клиент (`src/api/client.ts`)
- [ ] Zustand stores (`src/store/`)
- [ ] Утилиты и хелперы

### Фаза 2: Хуки

- [ ] useNetworkStatus
- [ ] useBrightness
- [ ] useSystemVolume
- [ ] usePlayerGestures
- [ ] usePictureInPicture

### Фаза 3: Компоненты

- [ ] GestureOverlay
- [ ] TrackSelector
- [ ] SpeedSelector
- [ ] NextEpisodeOverlay
- [ ] ChapterMarkers

### Фаза 4: Интеграционные тесты

- [ ] Подключение к Desktop серверу
- [ ] Загрузка библиотеки
- [ ] Воспроизведение видео

### Фаза 5: E2E тесты (Detox)

- [ ] Сценарий подключения
- [ ] Навигация по библиотеке
- [ ] Воспроизведение эпизода
- [ ] Жесты плеера

## Особенности тестирования React Native

### Нативные модули

Для тестирования нативных модулей (exoplayer-ass, exoplayer-sync) необходимо:

1. Mock нативных методов в Jest
2. Использование Detox для реальных устройств

### Жесты

Тестирование жестов требует специальных утилит:

- `@testing-library/react-native` для симуляции событий
- Detox для реальных жестов на устройстве

---

**Последнее обновление:** 2026-02-03
