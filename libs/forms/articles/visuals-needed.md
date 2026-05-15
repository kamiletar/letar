# Визуалы для статей @letar/forms

Список визуалов, которые нужно подготовить для серии статей. Каждый визуал привязан к конкретной статье и месту в тексте.

---

## Скриншоты

### Статья 01 — Формы в React: почему больно

- [ ] **До/после**: форма логина на vanilla React (48 строк) vs @letar/forms (5 строк JSX). Два скриншота рядом с одинаковым результатом
- [ ] **Ошибки валидации**: скриншот формы с красными ошибками под полями — типичный результат @letar/forms

### Статья 04 — 50+ полей

- [ ] **Галерея полей**: сетка скриншотов ключевых полей (3-4 колонки):
  - Rating (звёзды)
  - Currency (1 234 567 ₽)
  - Schedule (недельная сетка)
  - ColorPicker (палитра + hex)
  - RadioCard (карточки тарифов)
  - FileUpload (drag & drop зона)
  - Phone (маска + флаг)
  - RichText (WYSIWYG)
  - Tags (ввод тегов)
  - PasswordStrength (индикатор силы)
  - CreditCard (Stripe-style ввод карты с иконками брендов)
  - MatrixChoice (матрица вопросов × ответов)
  - TableEditor (inline-редактирование таблицы)
  - DataGrid (таблица с сортировкой и фильтрацией)
  - Likert (шкала согласия)
  - Document.INN (ИНН с маской и валидацией)

### Статья 05 — Мультистеп

- [ ] **Степпер**: скриншот мультистеп формы с прогрессом «Шаг 2 из 5»

### Статья 12 — Релиз

- [ ] **npm publish**: скриншот страницы @letar/forms на npmjs.com
- [ ] **GitHub repo**: скриншот главной страницы репозитория

---

## GIF-анимации

### Статья 05 — Мультистеп

- [ ] **Переходы шагов**: GIF анимации перехода между шагами (animated prop). 3-4 шага, плавный переход

### Статья 06 — Массивы и группы

- [ ] **Drag & drop**: GIF перетаскивания элементов массива (DragHandle + сортировка). Показать 4-5 элементов, перетащить один

### Статья 07 — FromSchema

- [ ] **Автогенерация**: GIF: пишем Zod-схему → форма появляется автоматически. Показать добавление нового поля в схему → поле сразу в форме

### Статья 09 — Offline

- [ ] **Offline sync**: GIF полного цикла:
  1. Заполнение формы онлайн
  2. Переход в оффлайн (OfflineIndicator жёлтый)
  3. Submit → «Сохранено локально»
  4. Восстановление связи → синхронизация → «Отправлено»

### Статья 10 — i18n

- [ ] **Переключение языка**: GIF: переключатель RU/EN, label и placeholder меняются мгновенно

---

## Диаграммы (Mermaid / Excalidraw)

### Статья 03 — Compound Components

- [ ] **Context API дерево**: диаграмма трёх уровней контекста
  ```
  <Form>                    → FormContext (schema, form instance)
    <Form.Group name="user">  → GroupContext (prefix: "user")
      <Form.Field.String>      → FieldContext (value, errors, meta)
  ```

### Статья 08 — ZenStack pipeline

- [ ] **Pipeline**: диаграмма потока данных
  ```
  schema.zmodel + @form.* → zenstack:generate → Zod-схемы (.meta) → Form.FromSchema → UI
  ```

### Статья 09 — Offline архитектура

- [ ] **Замена ASCII**: переделать текущую ASCII-диаграмму в нормальную:
  - Form Submit → [Онлайн?] → Да → onSubmit() → Сервер
  - Form Submit → [Онлайн?] → Нет → IndexedDB → SyncQueue → [Онлайн!] → Retry → Сервер

### Статья 12 — Архитектура библиотеки

- [ ] **Стек**: диаграмма зависимостей
  ```
  @letar/forms
  ├── TanStack Form (state)
  ├── Zod v4 (validation + meta)
  ├── Chakra UI v3 (UI)
  └── Опциональные: @dnd-kit, @tiptap, use-mask-input
  ```

---

## Инструменты

- **Скриншоты**: Playwright screenshot (headless Chrome) или ручные из form-develop-app
- **GIF**: Chrome DevTools MCP → gif_creator или OBS Studio
- **Диаграммы**: Excalidraw (https://excalidraw.com) или Mermaid в MDX

## Как добавлять

Готовые визуалы складывать в `libs/forms/articles/images/` с именами:

```
01-login-before-after.png
04-field-gallery.png
05-multistep-gif.gif
06-drag-drop.gif
08-pipeline-diagram.svg
09-offline-architecture.svg
```

В статьях вставлять:

```markdown
![Описание](./images/01-login-before-after.png)
```
