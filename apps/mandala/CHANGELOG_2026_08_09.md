# Changelog (Архив до 2026-08-09)

> Продолжение основного [CHANGELOG.md](./CHANGELOG.md)
> Версии: 0.22.1 — 0.28.0

## [0.28.0] - 2025-12-31

### Added

- Расширенные E2E тесты для полного покрытия пользовательских сценариев
  - `07-full-mandala-crud.admin.spec.ts` — полный CRUD мандал (создание с изображением, редактирование, удаление)
  - `08-full-product-crud.admin.spec.ts` — полный CRUD товаров (создание, редактирование цены, удаление)
  - `05-full-checkout.guest.spec.ts` — полный checkout flow (магазин → корзина → оформление → успех)
  - `09-admin-order-status.admin.spec.ts` — управление статусами заказов в админке
  - `10-integration-full-flow.admin.spec.ts` — интеграционный тест (админ создаёт товар → гость заказывает → админ управляет)
- Поддержка двух browser contexts в тестах (admin + guest)
- Cleanup тестовых данных после каждого CRUD блока

### Testing

- Всего тестов: 120 (включая 20 новых)
- Покрытие: публичные страницы, админка, корзина, checkout, SEO, мобильная версия

## [0.27.0] - 2025-12-30

### Added

- Учёт количества товаров (stock)
- Автоматический расчёт inStock
- Списание stock при оформлении заказа
- Блокировка кнопки "Добавить в корзину" при stock=0

## [0.26.0] - 2025-12-30

### Added

- Docker конфигурация для production деплоя
  - Dockerfile.production для standalone сборки Next.js
  - docker-compose.production.yml с PostgreSQL и Next.js app
  - .env.docker.example с описанием всех переменных окружения
- Интеграция с deploy-affected.sh для автоматического деплоя
- Порт 3004 для mandala-app, 5434 для PostgreSQL
- mandala-network для Docker коммуникации

### Changed

- Миграция завершена: 16/16 фаз (100%)

## [0.25.2] - 2025-12-30

### Added

- Компонент SeoField для автокопирования SEO полей из title/description
  - Кнопка копирования значения из основного поля
  - Режим привязки для автоматического обновления при изменении источника
  - Счётчик символов с цветовой индикацией (60 для title, 160 для description)
  - Автоматическое удаление HTML тегов из description
- Интеграция SeoField в формы мандал, товаров и контентных страниц

## [0.25.1] - 2025-12-30

### Fixed

- Устранено мигание светлой темы при загрузке страницы с тёмной системной темой (FOUC)
  - Убран globalCss из theme.ts (применялся через JS слишком поздно)
  - Добавлен global.css с CSS стилями для prefers-color-scheme и .dark/.light классов
  - next-themes теперь корректно применяет тему до hydration

## [0.25.0] - 2025-12-30

### Changed

- Оптимизация изображений в галерее и магазине через next/image fill
- MandalaCard: заменена Chakra Image на NextImage с fill и responsive sizes
- ProductCard: заменена Chakra Image на NextImage с fill и responsive sizes
- ProductSlider: заменена Chakra Image на NextImage с fill и responsive sizes
- MandalaNavigation: заменена Chakra Image на NextImage с fill (превью при hover)
- ParallaxImage: заменена Chakra Image на NextImage с fill
- ImageUploadField: заменена Chakra Image на NextImage с fill (админка)
- ProductImagesUpload: заменена Chakra Image на NextImage с fill (админка)
- Admin Mandala details: заменена Chakra Image на NextImage с fill

### Performance

- Автоматическая конвертация изображений в WebP/AVIF
- Responsive sizes для оптимальной загрузки на разных экранах
- Ленивая загрузка изображений ниже viewport

## [0.24.0] - 2025-12-28

### Added

- DnD сортировка мандал в админ-панели (/admin/mandalas)
- DnD сортировка товаров в админ-панели (/admin/products)
- Визуальные индикаторы перетаскивания (ручка, подсветка)
- Оптимистичное обновление UI при сортировке
- Автоматическое сохранение порядка на сервере

### Dependencies

- Добавлен @dnd-kit/modifiers@9.0.0

## [0.22.1] - 2025-12-24

### Added

- Галерея мандал
- Магазин товаров ручной работы
- Личный кабинет пользователя
