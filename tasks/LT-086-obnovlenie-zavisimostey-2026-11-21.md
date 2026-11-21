---
id: LT-086
title: Обновление зависимостей 2026-11-21
status: review
size: M
area: deps
priority: 3
blocked_by: []
owner: letar-dev-deps-nov21
stage: ""
source: ""
created: 2026-11-21
updated: 2026-11-21
---

## Что и зачем

Обновить зависимости в текущих semver-диапазонах, сохранить обоснованные пины,
устранить совместимые security-находки и проверить монорепозиторий.

## Приёмка

- Целостность зависимостей и существующие патчи проверены, новых peer-конфликтов нет.
- Выполнены typecheck, lint, test и безопасный build; ограничения явно записаны.
- Версия, CHANGELOG и документация обновлены, результат закоммичен.

## План

1. Зафиксировать исходные outdated/audit/integrity.
2. Обновить текущие диапазоны через bun update, проверить пины и патчи.
3. Выполнить проверки и адресно перепроверить сбои.
4. Записать результат и закоммитить.

## Журнал

- Исходный audit: 21 уязвимость (4 high, 15 moderate, 2 low), критичных нет.
- bun update: обновлены 111 прямых зависимостей; major-версии и защищённые пины сохранены.
- better-call переведён с 1.4.4 на ^1.4.6: Better Auth 1.7.27 зависит от 1.4.6,
  OAuth-плагин требует ~1.4.5; условие снятия пина выполнено, запись реестра удалена.
- Chakra React обновлён до 3.38.0. Upstream исправил simpleHash без сортировки ключей;
  старый патч удалён. Проверка memo на различение порядка ключей прошла в ESM и CJS.
- Добавлен security override Effect ^3.22.1 (GHSA-7589-6fvf-x4pw).
- Итоговый audit: 4 уязвимости (1 high, 3 moderate), критичных нет. High Zod 3
  уже ведётся в LT-078; остальные — @hono/node-server, glob и minimatch.
- Все восемь deps-gates прошли. Пять исходных peer-конфликтов (three и ESLint)
  сохранены без новых. Для electron-drift нужен Git Bash в PATH, системный bash — WSL без дистрибутива.
- Общий typecheck: 100 проектов; ошибки кастомных Chakra-вариантов только у domwellbes/aboi,
  проверяется последовательным повтором из-за общей генерации типов в node_modules.
- Lint: 148 проектов, два сбоя — unsafe optional chaining в mcp-server-kit и
  irregular whitespace в kami-e2e. Oxlint остаётся на прежней версии 1.89.0.
- Первый test-прогон остановлен после зависания двух дочерних Vitest-процессов;
  повтор запущен вне sandbox. Единственный завершившийся со сбоем тест поиска города
  в @letar/forms прошёл при отдельном повторе.
- Граф безопасной сборки проверен: 37 build-targets, исключены animatrona и animatrona-main;
  db:template/db:push/db:migrate в итоговом графе отсутствуют. Локальная БД не сбрасывалась.
- Логи проверок: .claude/artifacts/deps-nov21-*.log (игнорируются git).
- Повтор domwellbes/aboi вне sandbox с NX_ISOLATE_PLUGINS=false: domwellbes прошёл,
  aboi ещё падает. --parallel=1 не связывает генератор и typecheck одного приложения
  в атомарную пару: второй генератор может затереть типы до проверки первого приложения.
- Нативный smoke better-sqlite3 (запрос в :memory:), sharp и koffi прошёл.
- Отдельный aboi typecheck с его собственным theme:typegen прошёл.
- Подтверждена security-регрессия ZenStack: сравнительное репро на одной схеме/БД
  даёт rejected=true, role=null для 3.9.8 и rejected=false, role=OPERATOR для 3.10.3.
  Семейство возвращено на 3.9.8, введены точные пины и overrides всех девяти корневых
  пакетов, создана LT-087. В итоговом lock нет ZenStack 3.10.x.
- Политики Flora после отката прошли. Audit итогового дерева — 4 уязвимости,
  все восемь deps-gates зелёные, новых peer-конфликтов нет.
- Бинарник Electron доустановлен штатным install.js; ранее упавший тест Animatrona прошёл.
- Прогоны test/build на дереве с 3.10.3 остановлены перед откатом. Итоговые общие
  прогоны запущены заново на 3.9.8, исходные логи сохранены для диагностики.
- Локальный коммит обновления: 183076f0c, все pre-commit gates прошли.
- Итоговый typecheck 98 проектов: единственный сбой renderer TS6305 в .next/types;
  после временного переноса артефактов его исходники прошли, артефакты восстановлены.
  Domwellbes и aboi на безопасных зависимостях прошли отдельными запусками.
- Итоговый test: 108 проектов, 17м23с; четыре failed tasks — studio, domwellbes,
  forms-vue и forms-vue-shadcn. Оба Vue-набора и domwellbes прошли отдельно.
  Studio: локальная БД без ReferralAgent.poolBps; из пяти отдельно повторённых файлов
  32 теста прошли, три webhook-теста падают на неполных моках. Разбор остатков — LT-088.
- Production smoke form-example: HTTP 200, title @letar/forms — Examples;
  временный локальный сервер остановлен.
- При продолжении работы в исходном build-логе есть результаты 26/37 сборок без
  итоговой сводки; процесса больше нет. Из завершившихся — только driving-school
  с OOM. Запущены 11 оставшихся проектов и driving-school с NODE_OPTIONS heap 8192.
  Граф повтора проверен: db:template/db:push/db:migrate отсутствуют.
  Лог повтора — deps-nov21-build-remaining.log.

## Итог

Зависимости обновлены и закоммичены в 183076f0c, версия корня 0.0.3.
Security-регрессия ZenStack 3.10.3 подтверждена и исключена пинами 3.9.8 (LT-087).
Audit: 21 → 4 уязвимости, критичных нет; high Zod 3 остаётся в LT-078.
Все восемь deps-gates прошли, новых peer-конфликтов нет.

Проверки охватили 100 typecheck-проектов, 148 lint-проектов, 108 test-проектов
и 37 безопасных build-targets. Итог сборок: 35/37 успешны. Driving-school прошёл
при heap 8192; kami-key-the и dsperevod не прошли (alias и доступ к БД, см. LT-079/LT-088).
Animatrona и animatrona-main исключены из build из-за небезопасного db:template.

Общий quality gate не зелёный: остаются два lint-сбоя, Studio test (схема локальной
БД и моки), конфликт renderer .next/types. Flaky Vue/Vue Shadcn и domwellbes tests
прошли отдельно; оба приложения с theme:typegen прошли отдельными проверками типов.
Остатки и точные логи собраны в LT-088. HTTP smoke form-example прошёл.
Push и деплой не выполнялись.
