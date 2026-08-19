# Pravda - План разработки

## Текущая версия: 1.9.0

## Текущий статус

✅ Фазы 1–7 завершены — перенесены в `PLAN_COMPLETED.md` (2026-08-09).

Активная работа — см. Backlog ниже.

---

## Backlog

### 🟡 Тема

- [ ] Аудит `_active: scale()` в `src/theme/recipes/*.ts` на `pressScale` (`@letar/ui`) — задача
      описана в [press-scale-audit-task.md](/.claude/docs/press-scale-audit-task.md)

### 🔴 Приоритетные баги — staging e2e (найдено BlackCove, §18.7 Тираж M1, 2026-07-22)

**Раунд 2026-08-12 (214/240 passed, 18 failed, 5 flaky) — частично закрыто:**

- [x] **Застрявший прогресс-бар TOC + случайный активный пункт** — `toc.tsx`/`mobile-toc.tsx`:
      `cancelAnimationFrame` в cleanup не сбрасывал `rafIdRef.current` в `null`, `handleScroll()`
      следующей инстанции эффекта видел «устаревший» id и навсегда пропускал кадр. Плюс два
      конкурирующих `IntersectionObserver` (Section-контейнер и вложенный Chapter) боролись за
      `aria-current`. Коммит `850f0f62`
- [x] **webkit: дублированная разметка `Article`** — `mdx/article.tsx` рендерил КАЖДУЮ статью
      дважды (отдельный `Flex` для мобильного и десктопного лейаута, оба в DOM одновременно, просто
      один `display:none`) — `bookmarks.spec.ts` матчил скрытый мобильный `<BookmarkButton>`,
      `cross-refs.spec.ts` ловил `strict mode violation` на задвоенном `<CrossRef>`. Коммит
      `bbc5aad2`
- [ ] **TOC всё ещё пустой на всех 3 браузерах** — `toc.locator('a').count()` возвращает `0`
      (`documents.spec.ts:30`, `toc.spec.ts:32`), стабильно на chromium+firefox+webkit. Это ДРУГОЙ
      баг, чем прогресс-бар/активный пункт выше — те фиксы его не затронули. Не диагностировано
- [ ] **RSC-навигация не меняет URL в Firefox/WebKit** (`navigation.spec.ts:38/97/117/132/148/168`)
      — клик по `nav a[href="..."]`, `toHaveURL()` таймаутит, `page.url()` не меняется. Chromium
      работает. Не диагностировано
- [ ] **Command Palette Escape (webkit)** — флейк, не воспроизведён в изолированных повторных
      прогонах, код не менялся

Ждём от BlackCove решения по TOC/навигации — чинить дальше или деплоить прод с этими двумя
известными кластерами.

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
