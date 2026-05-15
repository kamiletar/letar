# Фоновое скачивание — Android Foreground Service

## Проблема

При сворачивании приложения Android убивает JS-поток → загрузка через `react-native-blob-util` обрывается. При возврате задача `downloading` сбрасывается в `queued`, файл качается заново с нуля.

## Решение

Android Foreground Service с уведомлением о прогрессе. Сервис держит процесс живым, JS-поток продолжает работу. Логика загрузки в `downloadManager.ts` остаётся — добавляется только start/stop сервиса.

## Новые файлы

| Файл                                    | Описание                                         |
| --------------------------------------- | ------------------------------------------------ |
| `android/.../DownloadService.kt`        | Foreground Service с notification и progress bar |
| `android/.../DownloadServiceModule.kt`  | Нативный модуль: start/stop/updateProgress из JS |
| `android/.../DownloadServicePackage.kt` | Package для регистрации                          |

## Изменяемые файлы

| Файл                              | Изменение                                  |
| --------------------------------- | ------------------------------------------ |
| `AndroidManifest.xml`             | + permissions + `<service>` декларация     |
| `MainApplication.kt`              | + `packages.add(DownloadServicePackage())` |
| `src/services/downloadManager.ts` | + start/stop/updateProgress вызовы         |

## Реализация

### 1. DownloadService.kt

- Notification channel `animatrona_downloads` (LOW importance)
- Ongoing notification с progress bar
- Статическая ссылка `instance` для обновления уведомлений из Module
- `foregroundServiceType="dataSync"`

### 2. DownloadServiceModule.kt

- `startService()` → `ContextCompat.startForegroundService()`
- `stopService()` → `stopService()`
- `updateProgress(title, progress)` → обновляет notification через `DownloadService.instance`

### 3. AndroidManifest.xml

- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_DATA_SYNC` + `POST_NOTIFICATIONS`
- `<service android:name=".DownloadService" android:foregroundServiceType="dataSync" />`

### 4. downloadManager.ts

- `processQueue()`: есть задача → `startService()`, очередь пуста → `stopService()`
- progress callback: `updateProgress("Эп. N", percent)`
- `cancelActiveDownload()`: если нет следующей задачи → `stopService()`

## Проверка

1. Загрузка → свернуть → уведомление обновляется → вернуться → прогресс актуален
2. Очередь завершена → уведомление пропадает
3. Отмена → уведомление пропадает
4. Несколько эпизодов → все скачиваются последовательно до конца
