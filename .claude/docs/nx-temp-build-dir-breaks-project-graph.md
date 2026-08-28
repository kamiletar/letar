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

## Как делать прод-сборку во временный каталог безопасно

Проверено на `letar-landing` (Next 16.3.3, `output: 'standalone'`) тремя прогонами подряд:
база без `distDir` — `exit=0`; `distDir` **вне** каталога проекта — `exit=0`, standalone лёг в
`.nx/tmp/prodcheck-ll/standalone`; `distDir` внутри проекта — `exit=0`. Рецепт:

```js
// next.config.mjs — knob добавляется временно, в репозитории его нет ни у одного приложения
distDir: process.env.NEXT_DIST_DIR || '.next',
```

```bash
NEXT_DIST_DIR=../../.nx/tmp/prodcheck-<app> nx build <app> --skip-nx-cache
```

`.nx/` уже игнорируется и git, и Nx — вывод невидим для графа независимо от имени каталога.
Это надёжнее, чем полагаться на `.nxignore`: тот ловит `.next*`, а `.nx/tmp/` не требует, чтобы
имя вообще о чём-то догадывалось.

⚠️ **Ограничение вопреки ожиданию: `distDir` вне каталога проекта Next разрешает.** Валидация
(`next/dist/server/config.js`) проверяет ровно три вещи — что это строка, что не пустая и что не
`public`. Запрета на `../` нет.

⚠️ **Любой кастомный `distDir` правит `tsconfig.json` приложения.** Next дописывает в `include`
строки вида `../../.nx/tmp/prodcheck-<app>/types/**/*.ts` и не убирает их. Строки накапливаются
от прогона к прогону, легко уезжают в коммит и ссылаются на путь, которого у других нет. После
прод-проверки: `git checkout -- apps/<app>/tsconfig.json` (и вернуть `next.config`, если knob
добавлялся временно).

⚠️ **Не запускай второй `next build` параллельно с чужим.** Next отвечает
`Another next build process is already running` и падает — на общей машине с несколькими
агентами это выглядит как поломка твоей правки. Дважды дало ложный результат при проверке
выше: сначала «сборка падает на Chakra», потом «база тоже падает». Оба раза виновата была
чужая параллельная сборка, а не `distDir`.

## Соседняя грабля: `.gitignore` submodule корневой не наследует

Корневой `.gitignore` на вложенные независимые репозитории не действует (см.
[git.md](/.claude/rules/git.md)). Все 11 submodule держали точное `.next/` — закрыто
2026-08-28 переводом на `.next*/` в каждом (`aboi`, `aboi-e2e`, `aprel8008`, `domwellbes`,
`domwellbes-e2e`, `driving-school`, `driving-school-e2e`, `dsperevod`, `studio`, `svoichuzhie`,
`libs/driving-school-db`).

⚠️ **Проверка «шаблон ловит» через `git check-ignore .next` даёт ложный минус там, где каталога
`.next` нет на диске.** `.next*/` — dir-only паттерн (закрывающий слэш), а на несуществующий
путь такой паттерн не матчится: git не знает, каталог это или файл. Так же вело себя и прежнее
`.next/`, регрессии тут нет.

Обходится **без** создания каталога — спросить путь **внутри** него. Для вложенного пути git
знает, что компонент заведомо каталог, и dir-only паттерн матчит нормально:

```bash
git -C <submodule> check-ignore -q -- .next-prodcheck/package.json   # exit 0 = шаблон есть
```

Имя пробника намеренно не `.next`: под точное `.next/` он не попадёт, под шаблон `.next*/` —
попадёт. То есть проверяется именно шаблонность правила, а не факт «хоть что-то игнорируется».
Разложено по вариантам (2026-08-28, изолированный репозиторий):

| правило в `.gitignore` | пробник `.next-prodcheck/package.json` | пробник `.next/package.json` |
| ---------------------- | -------------------------------------- | ---------------------------- |
| `.next/`               | ❌ не игнорируется                     | ✅ игнорируется              |
| `/.next/`              | ❌ не игнорируется                     | ✅ игнорируется              |
| `.next*/`              | ✅ игнорируется                        | ✅ игнорируется              |
| `**/.next*`            | ✅ игнорируется                        | ✅ игнорируется              |

**Сторож против повторного расхождения** — `scripts/check-submodule-gitignore.mjs`, он ходит по
всем путям из `.gitmodules` этим же пробником:

```bash
bun scripts/check-submodule-gitignore.mjs
```

Скрипт ничего не правит (коммит внутри submodule — отдельное решение владельца) и в CI не
запускается: приватные submodule там намеренно не выкачиваются. Точки прогона — агент
`monorepo-health-check` и момент заведения нового submodule.

При первом же прогоне он нашёл два расхождения, которые ручной проход 2026-08-28 не заметил:
`apps/studio-e2e` (нет ни `.next*`, ни `dist` — сьют не входил в список «11 приложений») и
`apps/poster-microtext-desktop` (Nextron, держит анкоренные `/.next/` и `/renderer/.next/`).

## Что оказалось НЕ причиной

- **`workspaces` в корневом `package.json` уже узкие** — `apps/*`, `libs/*`, `libs/shared/*`.
  Обнаружение проектов по `package.json` ограничено этими глобами (Nx ≥ 15.0.11), и
  `apps/<app>/.next-prodcheck` под `apps/*` не подходит. Расширять или сужать их не нужно.
- **Вход в граф дал не `package.json`, а глубокие `include`-глобы плагина `@nx/vitest`** в
  `nx.json` — вида `apps/<app>/**/*`. Они и подхватили скопированный
  `.next-prodcheck/standalone/apps/<app>/vitest.config.ts` (в логе — предупреждения Vite ровно
  по этому пути). Сужать их до `apps/<app>/src/**/*` — отдельная задача с риском потерять
  реальные конфиги; `.nxignore` закрывает вопрос дешевле.
