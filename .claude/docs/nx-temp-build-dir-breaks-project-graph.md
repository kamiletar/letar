# Временный build-каталог внутри `apps/` роняет граф Nx у всех агентов сразу

⚠️ Ошибка выглядит как проблема конкретного приложения, а на самом деле ломает **весь
репозиторий**: пока каталог лежит на диске, любая `nx`-команда (`nx format`, `nx lint`,
`nx typecheck:tsgo`, `nx build`) падает **у всех** параллельно работающих агентов. В тексте
ошибки нет ни намёка на то, что виновата чужая сессия и лишний каталог.

## Симптом

```
NX  Failed to process project graph.

An error occurred while processing files for the @nx/eslint/plugin plugin.
  - apps/domwellbes/.next-prodcheck/standalone/apps/domwellbes/eslint.config.mjs:
      Cannot find module 'C:\web\letar\apps\domwellbes\.next-prodcheck\standalone\eslint.config.mjs'
The following projects are defined in multiple locations:
- domwellbes:
  - apps/domwellbes/.next-prodcheck/standalone/apps/domwellbes
  - apps/domwellbes
The projects in the following directories have no name provided:
  - apps/domwellbes/.next-prodcheck
```

## Как получается

Обычная и правильная практика — собрать прод-сборку во временный каталог, чтобы не затереть
`.next` работающего dev-сервера:

```js
// next.config.mjs
distDir: process.env.NEXT_DIST_DIR ?? '.next'
```

```bash
NEXT_DIST_DIR=.next-prodcheck nx build domwellbes
```

Дальше срабатывают две независимые вещи:

1. **`output: 'standalone'`** (стоит у 22 приложений монорепо) раскладывает внутрь distDir
   копию дерева воркспейса: `<distDir>/standalone/apps/<app>/project.json`,
   `eslint.config.mjs`, `vitest.config.ts` и т.д. Nx считает эти копии настоящими проектами —
   отсюда `MultipleProjectsWithSameNameError` и `ERR_MODULE_NOT_FOUND` у eslint-плагина
   (скопированный `eslint.config.mjs` тянет корневой конфиг по относительному пути, которого
   в копии нет).
2. **Next кладёт `package.json` в корень самого distDir** (`<distDir>/package.json`) — Nx
   видит каталог как проект без имени, отсюда `ProjectsWithNoNameError`.

Каталог `.next-prodcheck` не покрывался ни `.gitignore` (там было точное `.next`), ни
`.nxignore` (там было `**/.next`) — поэтому Nx его обходил.

## Что закрыто

`.nxignore` и корневой `.gitignore` переведены с точных имён на шаблоны:

```gitignore
# .nxignore
**/.next*
**/dist
**/dist-*

**/standalone/apps
**/standalone/libs
```

Два слоя, и **ни один из них не достаточен сам по себе** — проверено эмпирически:

- `**/.next*` — основной. Закрывает всю семью `NEXT_DIST_DIR`-имён (`.next-prodcheck`,
  `.next-tmp`, …). Именно он гасит `ProjectsWithNoNameError` от `<distDir>/package.json`,
  имя которого произвольно, — никакой сигнатуры по содержимому у этого файла нет.
- `**/standalone/apps` + `**/standalone/libs` — страховка по содержимому, не по имени
  каталога. Гасит самое разрушительное (`MultipleProjectsWithSameNameError` на **всех**
  проектах монорепо + падение eslint-плагина) даже если временный каталог назван совсем
  иначе. Проверено: с отключённым `**/.next*` оба этих класса ошибок исчезают, но
  `ProjectsWithNoNameError` на самом `.next-prodcheck` остаётся.

### ⚠️ `**/dist*` использовать нельзя

Соблазн написать `**/dist*` одним шаблоном (чтобы покрыть и `dist`, и `dist-electron`)
приводит к тому, что под него попадает настоящий исходник
`apps/animatrona-tracker/src/app/api/distributions/`. Последствие — не ошибка, а **тихое
отравление кэша**: файлы выпадают из обхода Nx, значит и из хэша inputs, значит правки в них
не инвалидируют кэш таргета. Поэтому `**/dist` + `**/dist-*` (дефис обязателен), а не
`**/dist*`.

То же рассуждение — при добавлении любого нового шаблона: сначала
`git ls-files | grep -E '(^|/)<шаблон>'`, и только потом в `.nxignore`.

## Как проверять, что правило действительно исключает

Правило, которое ничего не исключает, выглядит точно так же, как рабочее, — узнаешь об этом
в следующий раз, когда граф ляжет. Проверка:

```bash
nx show projects > /tmp/nx.txt 2>&1; echo "exit=$?"
grep -iE "Failed to process|multiple locations|no name provided|Cannot find module" /tmp/nx.txt
```

`exit=0` и пустой grep — правило работает. Если временного каталога сейчас нет, воспроизвести
можно так (и сразу убрать — пока он лежит, `nx` не работает у всех агентов):

```bash
mkdir -p apps/<app>/.tmpcheck/standalone/apps/<app>
cp apps/<app>/project.json apps/<app>/.tmpcheck/standalone/apps/<app>/
echo '{"type":"commonjs"}' > apps/<app>/.tmpcheck/package.json
```

⚠️ `NX_DAEMON=false nx show projects` на Windows под нагрузкой стабильно падает с
`Plugin worker ... exited unexpectedly` («did not receive a load message within 10 seconds»)
независимо от `.nxignore`. Это не результат проверки, а посторонний шум — проверяй обычным
`nx show projects` через демон.

## Соседняя грабля: `.gitignore` submodule корневой не наследует

Корневой `.gitignore` на вложенные независимые репозитории не действует (см.
[git.md](/.claude/rules/git.md)). На 2026-08-28 все 11 submodule держат точное `.next/`, а не
шаблон, — временный distDir внутри submodule по-прежнему висит untracked в его `git status`.
На граф Nx это не влияет (`.nxignore` в корне воркспейса покрывает всё дерево), поэтому
исправление вынесено отдельным пунктом — [PLAN-INFRA-4 §117](/PLAN-INFRA-4.md).

## Что было бы правильнее структурно

Временный distDir вообще не должен раскладываться внутрь `apps/` — тогда обходить его Nx не
будет по построению, независимо от имени. Кандидат — каталог под уже игнорируемым `.nx/`
(например `.nx/tmp/prodcheck-<app>`). Предложено в [PLAN-INFRA-4 §117](/PLAN-INFRA-4.md), в
сессии находки намеренно не переделывалось.
