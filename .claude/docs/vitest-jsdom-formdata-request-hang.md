# jsdom `Request.formData()` зависает навсегда, не бросает ошибку

Route Handler-тест, вызывающий `POST(new Request(url, { method: 'POST', body: fd }))` с
`fd instanceof FormData`, зависал на `await request.formData()` **внутри самого роута** ровно на
`testTimeout` (по умолчанию 5000мс) — `domwellbes/src/app/api/admin/house-drawings/route.spec.ts`,
2026-09-11. Пять из двадцати тестов файла падали с `Error: Test timed out in 5000ms`, ровно те,
что реально вызывают пайплайн (доходят до `request.formData()`) — оба теста на «гейт ролей», не
доходящие до этой строки, проходили штатно.

**Причина:** `vitest.config.mts` приложения задаёт `environment: 'jsdom'` глобально (нужен для
React-компонентов). Глобальные `Request`/`FormData`/`File` под jsdom-окружением — это
jsdom-полифиллы, не нативная реализация Node (undici). jsdom не умеет строить/парсить
multipart-тело `Request` из `FormData` — `.formData()` виснет на недочитанном стриме, вместо
`throw`/`reject`. Другие спеки Route Handler в этом же приложении (`api/assist/routes.spec.ts` и
аналоги) этой ловушки избегали случайно: они гоняют JSON-тело (`request.json()`), не
`FormData`/multipart.

**Фикс:** оверрайд окружения на файл, а не на весь проект — первая строка docblock-комментария
файла:

```ts
/**
 * @vitest-environment node
 * ...
 */
```

Node-окружение даёт нативные `Request`/`FormData`/`File` (undici), `.formData()` работает
корректно. Остальные тесты приложения (React-компоненты) не трогать — им jsdom нужен.

**Когда актуально:** любой новый тест Route Handler, реально отправляющий `FormData` (файловый
аплоад, multipart-форма) в `Request`, а не `request.json()`. JSON-тело этой ловушки не имеет —
чинить упреждающе только при переходе на `FormData`/`multipart/form-data`.
