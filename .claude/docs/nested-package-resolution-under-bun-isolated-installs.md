# Резолв транзитивной зависимости чужого пакета под изолированной установкой bun

**Короткий вывод:** обычный `import('@foo/bar')` из скрипта в `scripts/` не резолвится, даже
если `@foo/bar` установлен и виден в `bun.lock` — потому что он лежит только внутри
`node_modules` пакета, который его зависимостью объявляет, а не в корне репозитория. Фикс —
резолвить путь через `createRequire`, привязанный к уже разрешённому entry-файлу этого
родительского пакета, а не к своему собственному местоположению.

## Симптом

Нужно получить реальную схему полей, которую предоставляет `@better-auth/core` (транзитивная
зависимость `better-auth`), из скрипта `scripts/check-better-auth-schema.mjs` — не хардкодить
список полей руками и не парсить `dist`-файлы регэкспом. Прямой `import('@better-auth/core/db')`
от имени скрипта падает с `ERR_MODULE_NOT_FOUND`, хотя `better-auth` установлен, в `bun.lock`
`@better-auth/core` присутствует как его зависимость, и в `node_modules/better-auth/node_modules/`
пакет физически на месте.

## Причина

В этом монорепо bun ставит зависимости в изолированном режиме
(`node_modules/.bun/<pkg>@<version>+<hash>/...`, см.
[bun-install-stale-isolated-cache](/.claude/docs/bun-install-stale-isolated-cache.md) о другом
следствии того же устройства хранилища). Транзитивная зависимость не хоистится в корневой
`node_modules` — она существует **только** внутри собственного `node_modules` пакета, который её
требует. У `better-auth` и у `@better-auth/oauth-provider` — каждого своя вложенная копия
`@better-auth/core`, они не обязаны совпадать по версии.

Обычный алгоритм резолва Node.js идёт вверх по дереву каталогов **от местоположения
импортирующего файла**. Скрипт в `scripts/` не находится внутри `node_modules/better-auth/`, у
него нет доступа к вложенным `node_modules` чужого пакета — только к тому, что хоистится в
корень репозитория (прямые зависимости репо, как сам `better-auth`).

## Решение

Резолвить не желаемый транзитивный пакет напрямую, а **сначала** пакет, который его реально
объявляет зависимостью, — от корня репозитория (он там есть, потому что это прямая зависимость).
Затем завести **новый** `createRequire`, привязанный к разрешённому entry-файлу этого пакета —
резолв транзитивного модуля стартует уже от его расположения и проходит через его собственный
`node_modules`.

```js
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

function resolvePackageMain(specifier) {
  const rootRequire = createRequire(path.join(repoRoot, 'package.json'))
  return rootRequire.resolve(specifier)
}

async function getRequiredAccountFields() {
  const betterAuthMain = resolvePackageMain('better-auth') // резолв от корня репо
  const nestedRequire = createRequire(betterAuthMain) // резолв от better-auth
  const coreDbPath = nestedRequire.resolve('@better-auth/core/db') // теперь находится
  const coreDb = await import(pathToFileURL(coreDbPath).href)
  return coreDb.getAuthTables({})
}
```

Три шага: резолв родителя от корня → `createRequire` от пути родителя → резолв нужного
транзитивного подпути через этот новый require. Дальше — обычный динамический `import()` по
уже найденному абсолютному пути.

Живой пример применения — `scripts/check-better-auth-schema.mjs`
(`resolvePackageMain`/`getRequiredAccountFields`/`getRequiredOauthClientFields`): скрипт этим же
приёмом добирается и до `@better-auth/oauth-provider` → его собственной схемы `oauthClient`, и
исполняет реальный код обоих пакетов (`getAuthTables({})`, `oauthProvider({})`) вместо парсинга
дистрибутива регэкспом — так проверка не отстаёт от следующего minor-апгрейда зависимости.

## Когда это применимо

Прием нужен именно для транзитивной зависимости чужого npm-пакета, которую собственный код
монорепо не объявляет напрямую. Если пакет — прямая зависимость самого репозитория (лежит в
корневом `package.json`), он и так хоистится в корень, и `import()`/`require.resolve()` от
любого файла репозитория резолвит его без этой цепочки.
