# Forms Dev - Воркфлоу разработки

## Инициализация

1. Прочитай `.claude/rules/forms.md` для правил работы с формами
2. Прочитай `libs/forms/README.md` для API библиотеки
3. Зарегистрируйся в agent-mail:
   ```
   macro_start_session(
     human_key: "C:/web/lena",
     program: "claude-code",
     model: "opus-4.6",
     task_description: "Разработка @letar/forms",
     file_reservation_paths: ["libs/forms/**", "libs/zenstack-form-plugin/**"],
     file_reservation_reason: "form-components development"
   )
   ```
4. **Проверь входящие запросы:**
   ```
   fetch_inbox(topic: "form-feature-request", include_bodies: true)
   ```
5. **Проверь backlog:** `libs/forms/PLAN.md` → секция "Backlog (запросы от агентов)"
6. Прочитай `apps/form-develop-app/PLAN.md` для текущего состояния задач
7. **Приоритизация:** входящие запросы от агентов > backlog > текущий план

## Координация (Forms Coordinator)

**Проверяй inbox** на задачи от координатора (topic: `forms-task`):

```
fetch_inbox(project_key: "app-c-web-lena", agent_name: "<твоё-имя>", topic: "forms-task", include_bodies: true)
```

После завершения задачи от координатора — **отвечай через reply_message** с результатом.

**⚠️ После добавления компонента ОБЯЗАТЕЛЬНО обнови `libs/form-mcp`** — list_fields, get_field_props, get_field_example. Координатор проверит!

## Действия

После изучения документации:

- Если есть задачи от FormsCoord (topic: `forms-task`) — **обработай их первыми**
- Если есть входящие запросы (topic: `form-feature-request`) — обработай следующими
- Если есть backlog запросы в PLAN.md — обработай следующими
- Иначе — определи текущую фазу и выбери задачу из плана
- Предложи план действий

## После завершения задачи

⚠️ **КРИТИЧНО:** Фаза НЕ считается завершённой без полного цикла документации. НЕ коммить, пока все 6 групп не обновлены.

### Группа 1: libs/forms

- [ ] `CHANGELOG.md` — запись новой версии
- [ ] `package.json` — увеличь версию (semver)
- [ ] `README.md` — добавь компонент в таблицу полей и секцию описания
- [ ] `docs/form-level.md` — если это form-level компонент (не Field)

### Группа 2: apps/form-develop-app

- [ ] `src/app/<demo-name>/page.tsx` — демо-страница нового компонента
- [ ] `src/app/page.tsx` — ссылка на демо с главной
- [ ] `PLAN.md` — отметь задачу как выполненную
- [ ] `CHANGELOG.md` — запись об изменениях
- [ ] `PLAN_TESTING.md` — если добавил тесты

### Группа 3: apps/form-docs (документация)

- [ ] `content/docs/guides/<slug>.mdx` — guide MDX страница
- [ ] `content/docs/guides/meta.json` — добавь slug в pages массив
- [ ] `src/app/demo/<category>/page.tsx` — интерактивная демо-страница
- [ ] `content/docs/api/form-component.mdx` — добавь props в API reference

### Группа 4: apps/form-example (showcase)

- [ ] `src/app/examples/<name>/page.tsx` — страница примера
- [ ] `src/components/nav.tsx` — добавь ссылку в навигацию

### Группа 5: Метадокументация

- [ ] `libs/forms/NEW_COMPONENTS.md` — отметь фазу как done

### Группа 6: Ответ агентам (если задача из agent-mail)

- [ ] `reply_message(message_id: <id>, body_md: "Реализовано в v<версия>: <описание>")`

### Порядок работы

1. Реализуй компонент + тесты в libs/forms
2. Обнови Группу 1 (библиотека)
3. Обнови Группу 2 (песочница)
4. Обнови Группу 3 (документация)
5. Обнови Группу 4 (showcase)
6. Обнови Группу 5 (метадокументация)
7. Запусти preview_start для form-develop-app и form-docs — визуально проверь
8. Коммит только после прохождения всех групп

## Проекты экосистемы форм

### form-develop-app (песочница)

**Приложение:** form-develop-app
**Порт:** 3006
**Описание:** Песочница для разработки @letar/forms
**Библиотека:** libs/forms
**Правила:** `.claude/rules/forms.md`

25 демо-страниц, 21 E2E тест, все фазы 1-15 завершены.

### form-docs (документация)

**Приложение:** form-docs
**Порт:** 3020
**Домен:** [forms.letar.best](https://forms.letar.best)
**Описание:** Документация @letar/forms на базе Fumadocs MDX
**Структура:** `[lang]/docs/[[...slug]]` — мультиязычная документация + `demo/` — интерактивные демо

Демо-страницы: basic, string, number, date, select, specialized, groups, conditional, multi-step, auto-fields, fields-all, validation.

### form-example (showcase)

**Приложение:** form-example
**Порт:** 3022
**Домен:** [forms-example.letar.best](https://forms-example.letar.best)
**Описание:** Showcase приложение @letar/forms для внешних пользователей
**Модели:** `schema.zmodel` с `@form.*` директивами → `src/generated/form-schemas/`

Страницы: basic, all-fields, validation, conditional, multi-step, groups, auto-fields, zenstack, theming, i18n, offline.

### @letar/forms (библиотека)

**Библиотека:** libs/forms
**Версия:** 0.56.0
**npm пакет:** @letar/forms
**Описание:** 40+ полей, compound component API, Zod v4, offline, i18n, ZenStack интеграция

### @letar/zenstack-form-plugin (плагин)

**Библиотека:** libs/zenstack-form-plugin
**Версия:** 2.1.0
**Описание:** Генерация Zod form schemas из `schema.zmodel` с `@form.*` директивами
