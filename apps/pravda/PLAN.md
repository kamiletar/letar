# Pravda - План разработки

## Текущая версия: 1.9.0

## Текущий статус

✅ Фазы 1–7 завершены — перенесены в `PLAN_COMPLETED.md` (2026-08-09).

Активная работа — см. Backlog ниже.

---

## Backlog

### 🔴 Приоритетные баги — staging e2e (найдено BlackCove, §18.7 Тираж M1, 2026-07-22)

Полный e2e-прогон на `pravda-stage.s3.letar.best` после фикса `toc.spec.ts` (см. `PLAN_COMPLETED.md`):
187 passed / 49 failed / 1 flaky / 3 skipped. Реальные баги приложения (не тестовые):

- **TOC пустой** — `TOC содержит пункты из документа` (все 3 браузера): `toc.locator('a[href^="#"]').count()` возвращает `0`. Либо TOC не рендерится, либо селектор больше не матчит структуру после недавних изменений.
- **Подсветка активного пункта не работает** — `aria-current` ожидается `"location"`, получено `""`/`null`.
- **RSC-навигация не меняет URL в Firefox/WebKit** (`navigation.spec.ts`) — клик по `nav a[href="..."]`, `page.toHaveURL()` таймаутит, `page.url()` остаётся на предыдущей странице. Chromium работает. `trace.zip` собраны и лежат на s3 (`apps/pravda-e2e/test-output/playwright/output/navigation-*-{firefox,webkit}-retry1/trace.zip`) — не проверил лично, ждёт диагностики с трейсами.
- **`bookmarks.spec.ts`** — кнопка «Добавить в закладки» скрыта/таймаут клика.
- **`cross-refs.spec.ts`** — `strict mode violation: resolved to 2 elements` (текст «см. …» матчит два элемента).
- **`documents.spec.ts`** — проблемы с `BookmarkButton`.

Не диагностировано глубже в этой сессии — не входило в скоуп (только `toc.spec.ts` href.slice
чинился явно). `retries: 1` уже в `playwright.config.ts` (нужен для сбора trace.zip на реальных
фейлах) — можно вернуть на дефолт после диагностики, если больше не нужен.

- [x] Печать документов (кнопка + CSS @media print)
- [x] Экспорт в PDF (через диалог печати браузера)
- [ ] Сравнение редакций
- [ ] История изменений статей
- [ ] Комментарии к статьям
- [x] Закладки пользователя (localStorage + страница /bookmarks)
- [x] SEO оптимизация (robots, sitemap, meta, OG, JSON-LD)
- [x] Перекрёстные ссылки (CrossRef компонент)

---

**Последнее обновление:** 2026-08-09
