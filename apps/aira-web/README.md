# Aira Web

Сайт с релизами Aira — пост-квантового P2P мессенджера.

## Стек

Версия — в [package.json](package.json) и топ-записи [CHANGELOG.md](CHANGELOG.md).

| Параметр    | Значение        |
| ----------- | --------------- |
| **Порт**    | 3017            |
| **Next.js** | 16              |
| **React**   | 19              |
| **UI**      | Chakra UI v3    |
| **Домен**   | aira.letar.best |

## Быстрый старт

```bash
nx dev aira-web           # Разработка
nx format aira-web        # Форматирование
nx lint aira-web          # oxlint → ESLint
nx typecheck:tsgo aira-web # Проверка типов
nx test aira-web          # Тесты
```

## Источники данных

- **GitHub Releases API** — автоматическая загрузка релизов из `aira-messenger/aira`
- **MDX файлы** — кастомные страницы контента
