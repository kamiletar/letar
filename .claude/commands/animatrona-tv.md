# Animatrona TV - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/animatrona-tv/README.md` для обзора приложения
2. Прочитай `apps/animatrona-tv/PLAN.md` для текущего состояния задач

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## Координация (Animatrona Coordinator)

**После каждого значимого изменения** уведоми координатора:

```
send_message(to: ["GrayMill"], subject: "change: <описание>", topic: "animatrona-change",
  body_md: "app: animatrona-tv\ntype: <type-change|ui-change>\nfiles: <затронутые файлы>\ndescription: <что изменилось>\nbreaking: true/false")
```

Также **проверяй inbox** на задачи от координатора (topic: `animatrona-task`).

**⚠️ НЕ правь код** в `animatrona`, `animatrona-web`, `animatrona-tracker`, `animatrona-mobile` — только уведомляй координатора.

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Проект

**Приложение:** animatrona-tv (React Native)
**Платформа:** Android TV (Min SDK 24)
**Описание:** TV плеер для просмотра аниме из библиотеки Animatrona Desktop

## Технологии

- React Native 0.80
- React Navigation 7
- ExoPlayer (через @letar/exoplayer-sync)
- Zustand (state management)
- AsyncStorage (прогресс просмотра)

## Команды разработки

```bash
# Metro bundler
nx start animatrona-tv

# Сборка и установка debug APK
nx android animatrona-tv

# Или отдельно:
nx build-android animatrona-tv
adb install -r apps/animatrona-tv/android/app/build/outputs/apk/debug/app-debug.apk

# Релизная сборка
nx build-android-release animatrona-tv
```

## Особенности

- Навигация D-Pad / пультом (не touch)
- Leanback-стиль интерфейса для TV
- Синхронизированное воспроизведение видео + внешнего аудио
- API клиент переиспользован из animatrona-mobile
