---
paths: 'apps/mandala/**/*'
---

# Mandala — Галерея мандал

## Описание

Mandala — галерея изображений мандал с возможностью просмотра, фильтрации и скачивания.

## Структура

```
apps/mandala/
├── app/
│   ├── gallery/          # Галерея изображений
│   ├── [id]/             # Страница мандалы
│   ├── categories/       # Категории
│   ├── admin/            # Админ-панель
│   └── api/
│       └── images/       # API изображений
├── schema.zmodel
└── uploads/              # Загруженные изображения
```

## Основные сущности

```zmodel
model Mandala {
  id          String   @id @default(cuid())
  title       String
  description String?
  imageUrl    String
  category    Category @relation(...)
  tags        Tag[]
  downloads   Int      @default(0)
  createdAt   DateTime @default(now())
}

model Category {
  id       String    @id @default(cuid())
  name     String
  slug     String    @unique
  mandalas Mandala[]
}
```

## Особенности

- **Массовая загрузка** — drag & drop нескольких изображений
- **Watermarks** — автоматическое добавление при скачивании
- **SEO** — optimized metadata для каждой мандалы

## Правила для изображений

- **MUST** хранить в `uploads/`, не в `public/`
- **MUST** генерировать thumbnails при загрузке
- **SHOULD** конвертировать в WebP
- **SHOULD** добавлять alt text для SEO

## Документация

- См. `apps/mandala/README.md`
- → Skill: `image-optimization` для работы с изображениями
