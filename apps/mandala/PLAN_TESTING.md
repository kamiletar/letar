# План тестирования — Mandala

## Статистика

| Тип  | Файлов | Тестов          | Статус       |
| ---- | ------ | --------------- | ------------ |
| Unit | 18     | 309 (7 skipped) | ✅ Завершено |
| E2E  | 20     | ~2193 LOC       | ✅ Завершено |

## Запуск тестов

```bash
# Unit/Integration тесты
nx test mandala
nx test mandala -- --watch    # Watch режим
nx test mandala -- --coverage # С покрытием

# E2E тесты
nx e2e mandala-e2e
nx e2e mandala-e2e -- --ui    # С UI
```

## Unit-тесты по модулям

### lib/actions (55 тестов)

| Файл                            | Тестов | Описание               |
| ------------------------------- | ------ | ---------------------- |
| `with-admin-auth.spec.ts`       | 8      | Авторизация админа     |
| `create-action-factory.spec.ts` | 9      | Фабрика create actions |
| `update-action-factory.spec.ts` | 10     | Фабрика update actions |
| `delete-action-factory.spec.ts` | 8      | Фабрика delete actions |
| `bulk-actions-factory.spec.ts`  | 12     | Массовые операции      |
| `error-helpers.spec.ts`         | 8      | Обработка ошибок       |

### Zod схемы (113 тестов)

| Файл                          | Тестов | Описание                       |
| ----------------------------- | ------ | ------------------------------ |
| `common.schema.spec.ts`       | 23     | Общие схемы (email, slug, etc) |
| `checkout.schema.spec.ts`     | 18     | Схемы оформления заказа        |
| `mandala.schema.spec.ts`      | 23     | Админ-схема мандал             |
| `product.schema.spec.ts`      | 27     | Админ-схема товаров            |
| `content-page.schema.spec.ts` | 22     | Админ-схема контент-страниц    |

### Хуки (54 теста)

| Файл                         | Тестов | Описание              |
| ---------------------------- | ------ | --------------------- |
| `use-admin-form.spec.ts`     | 12     | Админ-форма с toaster |
| `use-file-drag-drop.spec.ts` | 23     | Drag & drop файлов    |
| `use-image-upload.spec.ts`   | 19     | Загрузка изображений  |

### Email сервис (29 тестов)

| Файл                          | Тестов | Описание                  |
| ----------------------------- | ------ | ------------------------- |
| `email-service.spec.ts`       | 19     | Форматирование и отправка |
| `nodemailer-provider.spec.ts` | 10     | SMTP транспорт            |

### Audio/OPFS утилиты (65 тестов, 7 skipped)

| Файл                  | Тестов      | Описание                      |
| --------------------- | ----------- | ----------------------------- |
| `audio-utils.spec.ts` | 32          | Анализ частот, beat detection |
| `opfs-utils.spec.ts`  | 33 (7 skip) | OPFS файловая система         |

> **Примечание:** 7 тестов для OPFS API помечены как skipped — они требуют браузерный контекст (happy-dom или Playwright).

## E2E тесты (apps/mandala-e2e)

20 файлов, ~2193 LOC. Покрытие критичных путей:

- ✅ Галерея мандал (просмотр, фильтрация, детали)
- ✅ Магазин товаров (каталог, карточка, слайдеры)
- ✅ Корзина и оформление заказа
- ✅ Админ-панель (CRUD для всех сущностей)
- ✅ Аутентификация (sign-in, sign-up, logout)
- ✅ Контентные страницы

---

**Последнее обновление:** 2026-01-08 | **Версия:** 0.37.0
