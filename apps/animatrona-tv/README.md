# Animatrona TV

Android TV приложение для просмотра аниме с Desktop сервера Animatrona.

## Возможности

- Подключение к Animatrona Desktop серверу
- Просмотр библиотеки аниме в Leanback-стиле
- Синхронизированное воспроизведение видео + внешнего аудио
- Поддержка субтитров (ASS/SRT)
- Сохранение прогресса просмотра
- Навигация D-Pad / пультом

## Требования

- Android TV 7.0+ (API 24+)
- Animatrona Desktop запущен в локальной сети

## Установка

### Разработка

```bash
# Запуск Metro bundler
nx start animatrona-tv

# Сборка и установка debug APK
nx android animatrona-tv

# Или отдельно:
nx build-android animatrona-tv
adb install -r apps/animatrona-tv/android/app/build/outputs/apk/debug/app-debug.apk
```

### Релизная сборка

```bash
nx build-android-release animatrona-tv
```

## Использование

1. Запустите Animatrona Desktop на компьютере
2. Убедитесь, что TV и компьютер в одной сети
3. Откройте приложение на TV
4. Введите URL сервера (например, `http://192.168.1.100:3100`)
5. Просматривайте библиотеку и смотрите аниме

## Навигация

| Кнопка         | Действие              |
| -------------- | --------------------- |
| D-Pad          | Навигация по меню     |
| Enter/OK       | Выбор                 |
| Back           | Назад                 |
| Play/Pause     | Пауза/воспроизведение |
| Rewind/Forward | Перемотка ±10 сек     |

## Структура проекта

```
src/
├── api/              # API клиент (из animatrona-mobile)
├── store/            # Zustand store
├── hooks/            # React хуки
├── components/tv/    # TV-специфичные компоненты
├── navigation/       # React Navigation
└── screens/          # Экраны приложения
```

## Технологии

- React Native 0.80.3
- ExoPlayer (через @letar/exoplayer-sync)
- Zustand для state management
- React Navigation
- AsyncStorage для прогресса

## Связанные проекты

- [animatrona](../animatrona) — Desktop приложение (Electron)
- [animatrona-mobile](../animatrona-mobile) — Мобильное приложение
- [exoplayer-sync](../../libs/exoplayer-sync) — Видеоплеер

---

