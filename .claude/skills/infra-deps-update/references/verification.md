# Проверенные решения LT-086

Читайте нужный раздел по условию в SKILL.md. Текущие пины и патчи берите из файлов
репозитория, а не из исторических номеров версий ниже.

## Права ORM

На одной локальной БД и одной схеме запрос пользователя с `isOperator: false`
менял nullable роль null → OPERATOR. ZenStack 3.9.8 отклонял запрос и сохранял null;
3.10.3 выполнял его вопреки `@@deny('post-update', ... before().platformRole != platformRole)`.
Семейство вернули на 3.9.8, включая overrides/resolutions для workspace-потребителей.
Детали: [репро и пины](/.claude/docs/zenstack-post-update-null-comparison-regression.md).

Проверяйте кандидат на временных fixtures: разрешённое изменение, запрещённое изменение,
состояние строки после отказа. Сравнивайте одинаковые схему, данные и auth-контекст;
временные записи удаляйте в finally. Не ослабляйте политику ради обновления пакета.
SQL-причина дефекта не установлена: nullable-сравнение — условие воспроизведения,
а не доказательство внутренней SQL-ошибки. Условие следующего обновления — LT-087.

## Патчи

Пересоздание ещё нужного патча:

```bash
bun patch <package>@<новая-версия>
# Применить нужное исправление в подготовленной копии, включая ESM/CJS при наличии.
bun patch --commit node_modules/<package>
# Удалить только старый patch-файл, он не удаляется автоматически.
bun scripts/check-all.mjs --only=patched-deps
```

В Chakra 3.38.0 ESM/CJS `utils/memo` уже использовали `Object.keys(value)` без сортировки.
Старая замена `.sort()` не применялась, потому что upstream исправлен. Для обоих экспортов `memo`:

```javascript
const cached = memo((value) => Object.keys(value).join(','))
if (cached({ color: 1, fontSize: 2 }) === cached({ fontSize: 2, color: 1 })) {
  throw new Error('Кеш потерял порядок свойств')
}
```

После проверки удалены старый patch-файл и запись `patchedDependencies`, обновлён lockfile.
Подробности: [гидратация и memo](/.claude/docs/chakra-css-memo-prop-order-hydration.md).

## Повторы и среда

### Граф и незавершённые задачи

Для графа LT-086 исключение animatrona-main и animatrona убрало небезопасный db:template:

```powershell
nx run-many -t build --exclude=animatrona-main,animatrona --graph=.claude/artifacts/deps-build-safe.json
```

Это пример проверенного графа, не вечный список исключений. В использованном формате
`tasks.dependencies` содержит объекты `{ id: 'project:target' }`.
Проследите пути до сомнительных prerequisites и проверьте команды этих targets.

В прерванном LT-086 были результаты 26 из 37 сборок без сводки. Повторили 11 непроверенных
проектов и неуспешный driving-school; дублирующий prerequisite не считали отдельным успехом.
Итог — 35/37, два оставшихся сбоя сохранены в LT-079/LT-088. Нельзя считать начатую задачу
успешной без достаточного подтверждения завершения.

### OOM и плагины

После OOM driving-school прошёл при увеличенном heap:

```powershell
$env:NODE_OPTIONS='--max-old-space-size=8192'
nx build driving-school
```

Учитывайте память и параллелизм. Отсутствие OOM у ещё работающего процесса не доказывает успех.

Отключение изоляции однажды помогло пройти аварийный Nx worker, но новое построение графа
с `NX_ISOLATE_PLUGINS=false` сломало относительный next-intl config aboi. Помогла штатная изоляция:

```powershell
Remove-Item Env:NX_ISOLATE_PLUGINS -ErrorAction SilentlyContinue
```

Системный bash оказался WSL без дистрибутива; electron-drift прошёл с Git Bash в PATH:

```powershell
$env:Path='C:\Program Files\Git\bin;'+$env:Path
bun scripts/check-all.mjs --group=deps
```

### Общие типы и таймауты

Chakra CLI пишет в общую копию пакета. Проверенные отдельные последовательные запуски:

```powershell
nx typecheck:tsgo domwellbes --skip-nx-cache
nx typecheck:tsgo aboi --skip-nx-cache
```

Не должно быть конкурирующего theme:typegen. Разбор:
[гонка типов](/.claude/docs/chakra-typegen-shared-node-modules-race.md).
Renderer проверили после временного переноса `.next/types`, затем артефакты вернули:
это диагностика TS6305/references, а не исправление конфигурации.

Vue/Vue Shadcn lazy-поля и один тест domwellbes прошли отдельно. Studio сохранил ошибку
колонки локальной БД и неполные моки. Повтор отделяет причины, но сам по себе не доказывает,
что все ошибки существовали до обновления. Не синхронизируйте пользовательскую БД ради тестов.

### Бинарник Electron

При подтверждённом отсутствии бинарника установленного npm-пакета помог штатный установщик:

```powershell
node node_modules/electron/install.js
```

Повтор затронутого теста прошёл. Это не повод доверять всем записям `bun pm untrusted`.
Нативные better-sqlite3 (запрос в :memory:), sharp и koffi проверялись отдельно.
