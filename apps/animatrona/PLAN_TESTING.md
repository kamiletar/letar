# План тестирования — Animatrona

## Статистика

| Тип  | Количество                | Статус                          |
| ---- | ------------------------- | ------------------------------- |
| Unit | 138 в 10 файлах           | Растёт точечно вместе с фиксами |
| E2E  | см. `apps/animatrona-e2e` | Есть, отдельным проектом        |

⚠️ До 2026-09-08 в этой таблице стояло «Unit 0 / E2E 0 — планируется», хотя тесты давно писались
(фактическое число берётся из `nx test animatrona`, не из этого файла). Если снова разойдётся —
верить прогону.

## Запуск тестов

```bash
nx test animatrona
nx e2e animatrona-e2e
```

## План по фазам

### Фаза 1: Базовые тесты

- [ ] Базовая функциональность

### Фаза 2: Импорт

- [x] `main/services/__tests__/manifest-generator-chapters.spec.ts` — источник глав эпизода
      (3 теста): автоопределённые OP/ED применяются, когда в контейнере глав нет; главы контейнера
      имеют приоритет над автоопределёнными; при отсутствии обоих `ChaptersDocument` не создаётся
      вовсе. Регрессионный сторож к фиксу 2026-09-08 (главы детектора терялись молча, потому что
      писались в ещё не существующий манифест эпизода).
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
