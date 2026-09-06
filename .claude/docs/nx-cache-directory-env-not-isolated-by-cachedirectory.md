# `NX_CACHE_DIRECTORY` не изолирует кеш — hash→результат живёт в отдельном DB-кеше

## Симптом

Задача (PLAN-INFRA-6.md §157 задача №1): развести кеш Nx между staging- и production-сборкой,
потому что `nx.json` не объявляет ни одного `{"env": ...}`-инпута — окружение попадает в сборку
мимо Nx (`source .env.staging`/`.env.docker` в `deploy-affected.sh`), и одинаковый коммит с
разными `NEXT_PUBLIC_*` даёт **один и тот же ключ кеша задачи**. Практическое следствие: после
переноса прод-сборки на общий с staging хост (§157) прод-билд может получить cache hit на
staging-артефакт с чужими `NEXT_PUBLIC_APP_URL`/аналитикой/ключами карт.

Первая попытка фикса — экспортировать `NX_CACHE_DIRECTORY=".nx/cache-staging"` /
`".nx/cache-prod"` перед первым вызовом `nx` в `deploy-affected.sh`. Nx официально поддерживает
эту переменную ([nx_docs](https://nx.dev), `cacheDirectory` в `nx.json` тоже задан явным полем) —
и она действительно **перебивает** `cacheDirectory` (подтверждено чтением исходника
`nx/dist/src/utils/cache-directory.js`: `process.env.NX_CACHE_DIRECTORY` проверяется первым,
раньше значения из `nx.json`).

**Тем не менее эмпирическая проверка показала: одной этой переменной недостаточно.** Сценарий:

1. Полностью очистить `.nx/cache-staging` (директория пуста или не существует).
2. Собрать `time` с `NX_CACHE_DIRECTORY=.nx/cache-staging` и `NEXT_PUBLIC_APP_URL=A`.
3. Собрать `time` **тем же** `NX_CACHE_DIRECTORY=.nx/cache-staging` (не менялся), но
   `NEXT_PUBLIC_APP_URL=B`.
4. Nx печатает `Nx read the output from the cache instead of running the command` — **cache hit**,
   хотя на диске в `.nx/cache-staging` нет ни одной директории с реальным артефактом задачи (только
   служебные `run.json`/`terminalOutputs`, не относящиеся к этой задаче).

## Причина

С Nx 19+ (в репозитории — 23.2) включён **DB-кеш** (`dbCacheEnabled()` в
`nx/dist/src/tasks-runner/cache.js`, `true` по умолчанию везде, кроме WASM-сборки). Реализация:

```js
// tasks-runner/cache.js
this.cache = new native_1.NxCache(
  workspace_root_1.workspaceRoot,
  cache_directory_1.cacheDir,       // ← это то, что двигает NX_CACHE_DIRECTORY
  (0, db_connection_1.getDbConnection)(),  // ← а это НЕТ
  ...
)
```

```js
// utils/db-connection.js
function getDbConnection(opts = {}) {
  opts.directory ??= sharedWorkspaceDataDirectory(workspace_root_1.workspaceRoot)
  // sharedWorkspaceDataDirectory → workspaceDataDirectoryForWorkspace → читает
  // process.env.NX_WORKSPACE_DATA_DIRECTORY ?? NX_PROJECT_GRAPH_CACHE_DIRECTORY ?? default
  // (".nx/workspace-data"), НЕЗАВИСИМО от cacheDirectory/NX_CACHE_DIRECTORY.
  ...
}
```

`cacheDir` (управляется `NX_CACHE_DIRECTORY`) отвечает только за то, **куда физически
складываются файлы-артефакты** задачи (outputs, terminal output). Но решение «эта задача уже
считалась, отдать закешированный результат» принимает `DbCache.get(task.hash)`, который смотрит
в SQLite-базу по пути `NX_WORKSPACE_DATA_DIRECTORY` (дефолт `.nx/workspace-data`) — **общую для
staging и production**, если её не развести отдельно. Хеш задачи не включает `NEXT_PUBLIC_*`
(в `nx.json` нет `{"env": ...}`-инпутов — см. постановку задачи выше), поэтому хеш одинаков для
обоих окружений, и DB-кеш радостно отвечает «уже считали» независимо от того, куда указывает
`cacheDirectory`.

Так что `.nx/cache`/`.nx/cache-staging`/`.nx/cache-prod` (папки для файлов) и
`.nx/workspace-data`/`.nx/workspace-data-staging`/`.nx/workspace-data-prod` (SQLite-индекс
хешей) — **два независимых механизма**, оба требуют разведения по окружению одновременно.

## Фикс

`deploy-affected.sh` в блоке выбора `ENV_FILE_NAME`/`STAGING` экспортирует **обе** переменные до
первого вызова `nx`:

```bash
export NX_CACHE_DIRECTORY=".nx/cache-staging"           # или -prod
export NX_WORKSPACE_DATA_DIRECTORY=".nx/workspace-data-staging"  # или -prod
```

Проверено эмпирически (та же методика: собрать дважды с разными `NEXT_PUBLIC_*`, но теперь с
обеими переменными разведёнными по-разному между прогонами) — второй прогон честно **не**
получает cache hit (`Cache: 0/1 hit`), и в собранном бандле лежит правильное для своего запуска
значение.

## Побочный эффект и почему он приемлем

Project graph (то, что раньше жило в общем `.nx/workspace-data` и пересчитывалось один раз за
`git pull`, ~17с по замеру в `deploy-affected.sh`) теперь пересчитывается **отдельно** для
staging и для production при первом билде каждого — по одному разу на окружение, не на каждый
деплой. Это не регресс относительно цели задачи: изоляция важнее экономии 17 секунд, а после
первого прогона на каждое окружение граф в своей `workspace-data-*` директории кешируется как
раньше.

## Как не наступить снова

Любая будущая правка, трогающая `NX_CACHE_DIRECTORY`/`cacheDirectory` в этом репозитории, обязана
проверять эмпирически (повторная сборка с другим значением переменной окружения, инпут в хеш не
включённой) — а не полагаться на официальную документацию переменной как на полное описание её
эффекта. Зелёная команда и «каталог создался с ожидаемым именем» ничего не доказывают: в этом
конкретном случае `.nx/cache-staging` создавался на диске корректно, но решение «отдать кеш»
принималось совсем в другом месте.

## Связанные доки

- [nx-vitest-plugin-worker-oom-shared-machine.md](nx-vitest-plugin-worker-oom-shared-machine.md) —
  другой пример нетривиального поведения Nx-плагинов, не описанного явно в конфиге проекта.
- [verification-pitfalls.md](verification-pitfalls.md) — общий реестр проверок, которые врут в
  успокаивающую сторону; этот случай («переменная перебивает конфиг, но не то, что вы думаете»)
  достоин туда попасть при следующей ревизии документа.
