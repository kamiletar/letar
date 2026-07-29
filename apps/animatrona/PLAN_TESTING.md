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
      не перехватывает `net.fetch` из main), и happy-path с РЕАЛЬНОЙ сетью (прямой матч по
      shikimoriId=9253 → шаг preview с корректным названием и активной кнопкой "Скачать и
      импортировать"). Мокнутый happy-path (без реальной сети) всё ещё НЕ покрыт — `webRequest`
      умеет только cancel/redirect, не подмену тела ответа; нужен dedicated test-mode hook для
      этого в main-процессе, см. комментарий в конце spec-файла.
      **Важная находка при первом реальном прогоне:** `net.fetch` (Electron/Chromium) падал
      `net::ERR_FAILED` на POST к shikimori.io под TUN-VPN (Clash), хотя тот же запрос через
      обычный Node-сокет проходил 200 OK — TUN-клиент режет по TLS-отпечатку Chromium-стека,
      а не по прокси-настройкам (`session.setProxy`/`proxyBypassRules` тут бессильны, см.
      `client.ts`). Пофикшено переводом `main/services/shikimori/{client,anime-api,
franchise-api}.ts` на глобальный `fetch` (Node/undici) вместо `net.fetch`.

---

**Последнее обновление:** 2026-07-28
