# Label Printer Desktop - Воркфлоу разработки

## Инициализация

1. Прочитай `apps/label-printer-desktop/PLAN.md` для текущего состояния задач
2. Прочитай `libs/label-printer-core/README.md` для API shared библиотеки

## Действия

После изучения документации:

- Определи текущую фазу разработки
- Выбери следующую задачу из плана
- Предложи план действий

## После завершения задачи

1. Обнови `PLAN.md` — отметь задачу как выполненную
2. Обнови `PLAN_COMPLETED.md` — добавь детали реализации
3. Обнови `CHANGELOG.md` — добавь запись об изменениях
4. Обнови `PLAN_TESTING.md` — если добавил тесты
5. Обнови `package.json` — увеличь версию (semver)

## Проект

**Приложение:** label-printer-desktop
**Тип:** Electron + Next.js (Nextron)
**Описание:** Desktop приложение для печати этикеток "Честный знак"
**Shared библиотека:** @letar/label-printer-core
**База данных:** SQLite + Prisma + ZenStack
