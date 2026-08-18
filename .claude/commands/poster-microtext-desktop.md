---
description: Воркфлоу разработки Electron-приложения poster-microtext-desktop — микротекст на постерах
---

# Poster Microtext Desktop - Воркфлоу разработки

**Submodule:** `kamiletar/letar-private-poster-microtext-desktop`

## Инициализация

1. Зарегистрируйся в Agent Mail и стартуй таймер — см. `.claude/rules/app-workflow.md`
   (agent_name `poster-microtext-desktop-dev`)
2. Прочитай `.claude/rules/electron.md` для общих правил Electron-приложений
3. Прочитай `apps/poster-microtext-desktop/PLAN.md` для текущего состояния задач

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## Особенности приложения

- Nextron (Electron main + Next.js renderer, статический экспорт `output: 'export'`)
- Вся бизнес-логика — в `main/services/poster-microtext.service.ts` (алгоритм адаптивного
  микротекста), никакого сервера внутри приложения, UI общается с main через IPC
- Renderer грузит именованный роут `/home` (не корень `/`) — см. `main/background.ts`
  и `renderer/app/page.tsx` (redirect). Паттерн взят из `label-printer-desktop`.
- `sharp` — нативный N-API модуль: в `main/webpack.config.js` он в `externals`,
  в `electron-builder.yml` — в `asarUnpack`. Транзитивные зависимости sharp
  (`detect-libc`, `semver`) прописаны как прямые deps в `package.json` — без этого
  упакованный `.exe` падает на `require('detect-libc')` (bun не хостит их в root
  node_modules, а Electron main грузит через обычный Node `require`, не bun-резолвер)

## После завершения задачи

Общий чеклист — `.claude/rules/app-workflow.md` (обнови PLAN.md/CHANGELOG.md/версию,
формат/лайнт/тайпчек, коммит). Специфика этого приложения:

1. Обнови `README.md`, если менялся интерфейс/параметры
2. Коммить и пушить **внутри submodule** (`cd apps/poster-microtext-desktop`), затем
   в `letar` — bump SHA (`git add apps/poster-microtext-desktop && git commit`)

## Деплой

Не применимо — приложение не деплоится на сервер, это локальный Windows `.exe`.
Сборка: `nx build:win poster-microtext-desktop` → `dist/*.exe` (NSIS-инсталлятор).

## Проект

**Приложение:** poster-microtext-desktop
**Тип:** Приватное Electron-приложение (Windows desktop)
**Домен:** нет — локальное приложение
**Описание:** Наносит на постер сетку скрытых микронадписей (читаются с 10–15 см,
не видны с дистанции); адаптивный сдвиг яркости букв под локальный фон.
