# New Lib - Создание библиотеки

Создай новую shared библиотеку в монорепозитории.

## Когда использовать

- Код переиспользуется в нескольких приложениях
- Нужна изоляция логики от UI
- Создание утилит, хуков, компонентов

## Структура

```
libs/<lib-name>/
├── src/
│   ├── index.ts          # Публичный API
│   └── lib/
│       ├── feature.ts
│       └── feature.spec.ts
├── package.json          # @letar/<lib-name>
├── project.json          # Nx конфигурация
├── tsconfig.json         # composite: true
├── tsconfig.lib.json
└── README.md             # Документация API
```

## Шаги

### 1. Создать структуру

```bash
mkdir -p libs/<lib-name>/src/lib
```

### 2. package.json

```json
{
  "name": "@letar/<lib-name>",
  "version": "0.1.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

### 3. tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "references": []
}
```

### 4. project.json

```json
{
  "name": "<lib-name>",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/<lib-name>/src",
  "projectType": "library",
  "tags": []
}
```

### 5. src/index.ts

```typescript
// Публичный API библиотеки
export * from './lib/feature'
```

### 6. README.md

```markdown
# @letar/<lib-name>

<Описание библиотеки>

## Установка

Библиотека включена в монорепозиторий.

\`\`\`typescript
import { ... } from '@letar/<lib-name>'
\`\`\`

## API

### Функция/Компонент

\`\`\`typescript
// Пример использования
\`\`\`

---

**Версия:** 0.1.0
```

## Подключение к приложению

В `tsconfig.json` приложения:

```json
{
  "compilerOptions": {
    "paths": {
      "@letar/<lib-name>": ["../../libs/<lib-name>/src/index.ts"]
    }
  },
  "references": [{ "path": "../../libs/<lib-name>" }]
}
```

## Синхронизация

```bash
nx sync
```

## Чеклист

- [ ] Структура создана
- [ ] package.json с @letar/ prefix
- [ ] tsconfig.json с composite: true
- [ ] Экспорт через src/index.ts
- [ ] README.md с API документацией
- [ ] Подключено к нужным приложениям
- [ ] `nx sync` выполнен

## Документация

См. [libs.md](/.claude/rules/libs.md)
