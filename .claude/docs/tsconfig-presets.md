# tsconfig-пресеты монорепо

## Иерархия

```
tsconfig.base.json          — общие для ВСЕХ проектов (apps + libs): strict, target, module...
  └ tsconfig.next-app.json  — общие для Next.js-приложений: jsx, lib, plugins:[next], include/exclude
      └ apps/<app>/tsconfig.json — только paths, references и осознанные переопределения
```

`tsconfig.next-app.json` лежит в корне репо, наследуется через `"extends": "../../tsconfig.next-app.json"`.

## `${configDir}` — обязателен для путей внутри пресета

Обычный относительный путь в наследуемом файле резолвится **относительно каталога самого
файла**, а не относительно конфига, который его подключает через `extends`. Проверено
эмпирически (`tsgo --showConfig`): `"outDir": "dist"` в `tsconfig.next-app.json` резолвился
в `../dist` — на уровень выше репо, не в `apps/<app>/dist`.

`${configDir}` — плейсхолдер TypeScript 5.5+/tsgo, который резолвится относительно конфига,
**наследующего** пресет (то есть `apps/<app>/tsconfig.json`). Все пути в `include`/`exclude`/
`outDir`/`tsBuildInfoFile` пресета обязаны использовать `${configDir}/...`, иначе унификация
молча ломает сборку каждого приложения.

## Что осознанно НЕ вынесено в пресет

- **`paths`** — уникален для каждого приложения (свой набор `@letar/*`-либ), не мержится между
  `extends`-уровнями (TypeScript берёт `paths` целиком с ближайшего уровня, не объединяет).
- **`references`** — то же самое, project references у каждого приложения свои.
- **`rootDir`** — встречался в исходных конфигах (`.`, `"../.."`, `"src"`), изначально выброшен
  из всех 18 мигрированных файлов с обоснованием «при `noEmit: true` ни на что не влияет».
  **Обоснование оказалось неверным** (2026-08-07): после того как `references` на `libs/*` убрали
  из `apps/<app>/tsconfig.json` (борьба с хрупким TS6305-редиректом, см. `.claude/rules/libs.md`
  §«Тот же фикс на приложениях...»), у 16 приложений вылез `TS6059: not under rootDir` — `outDir`
  из пресета форсирует проверку `rootDir` даже при `noEmit: true`, TypeScript просто выводит его
  сам из общего предка входных файлов программы, и без `references` этот предок стал слишком
  узким (исходники библиотек попадают в программу напрямую через `paths`). Точечный
  `"rootDir": "../.."` продублировали в каждом из 16 `apps/*/tsconfig.json` — сработало, потому
  что все 19 приложений на пресете лежат на одинаковой глубине (`apps/<app>/tsconfig.json`).
  Теперь вынесено в сам пресет — см. ниже.
- **`noUnusedLocals`/`noUnusedParameters`** — у части приложений (`driving-school`,
  `animatrona-tracker`, `mandala`, `form-develop-app`) стояли в `false`. Проверено эмпирически
  (`tsgo --noEmit` с `true`) на 6 приложениях с этим послаблением — **все прошли без единой
  ошибки**. Значит послабление устарело; в пресет вынесено НЕ выносить его — трогать каждое
  приложение отдельно и удалять `false`, а не тащить исключение в общий файл.
  У `mandala` оба override'а убраны (2026-08-04, обычный `tsc`/`tsgo` typecheck остался чистым);
  осталось убрать у `driving-school`, `animatrona-tracker`, `form-develop-app`.
- **`lib: [...,"webworker"]`** (`kami`, `pravda`) — используют Service Worker API, осознанное
  расширение сверх пресетного набора `["dom", "dom.iterable", "esnext"]`.
- **`types`** — три разных набора в исходниках (`["node","react","react-dom"]`, `["node"]`,
  не задано). Пресет фиксирует `["node","react","react-dom"]` как большинство; приложения с
  другим набором (`auth-hub`, `dashboard`, `driving-school`, `kami`, `mandala`,
  `animatrona-tracker`) переопределяют явно.

## Мёртвые записи, убранные при унификации (не задокументированы отдельно, т.к. просто удалены)

Найдены сравнением `include`/`exclude` с реальным содержимым репозитория:

- `exclude: ["jest.config.ts", "jest.config.cts"]` — в репозитории нет ни одного `jest.config.*`
  (тесты только на Vitest/Playwright). Мёртвая запись перекочевала из внешнего boilerplate.
- `exclude: ["eslint.config.js", "eslint.config.cjs"]` — все приложения используют
  `eslint.config.mjs`, `.js`/`.cjs`-вариантов в репозитории нет.
- `include: ["../../dist/apps/<app>/.next/types/**/*.ts"]` — ни одно приложение не переопределяет
  `distDir`, `dist/apps/` реально существует только для `dashboard-agent` (bare Node-сервис, не
  Next.js). Для Next.js-приложений путь никогда не существовал на диске.
- `include: ["package.json"]` — специально не нужен: `resolveJsonModule` резолвит `import
  packageJson from '../package.json'` (см. `footer.tsx` в 10 приложениях) без записи в `include`,
  что подтверждено `tsgo --listFiles` до/после на пилоте (`archetest`) — набор проверяемых файлов
  идентичен.
- `include: ["src/**/*.json"]` — не унифицировано в пресет: только 6 из 18 приложений его имели,
  и там, где нужен (единственный найденный случай — `archetest/src/.../max-scores-per-question.json`),
  JSON импортируется явно по относительному пути и резолвится без записи в `include`.
- `include: ["src/**/*.js", "src/**/*.jsx"]` — оставлены в пресете (безвредны), но по факту `.js`/
  `.jsx`-файлов в `src/` нет ни у одного из 18 приложений.

## `rootDir` в пресете (2026-08-07)

`"rootDir": "${configDir}/../.."` добавлен в `compilerOptions` пресета. `${configDir}` здесь
резолвится относительно `apps/<app>/tsconfig.json` (наследующего конфига), а не относительно
`tsconfig.next-app.json` — тот же механизм, что уже используют `outDir`/`include`/`exclude` выше
в этом файле. Поскольку все 19 потребителей пресета лежат на одинаковой глубине от корня репо
(`apps/<app>/tsconfig.json`), одна строка в пресете физически резолвится в корень репо для
каждого из них — идентично построчному `"rootDir": "../.."`, который раньше дублировался в
16 из 19 `apps/*/tsconfig.json` (у трёх — `kami`, `pravda`, `mandala` — уже стоял
`"${configDir}/../.."` до консолидации).

**Не выносить этот приём бездумно на другие поля пресета** — он работает только потому, что
глубина `apps/<app>/tsconfig.json` одинакова у всех потребителей. Если в пресет когда-нибудь
добавят приложение на другой глубине (вложенный подкаталог), `${configDir}/../..` для него
резолвится не в корень репо, а неправильно — потребуется либо не подключать его к этому пресету,
либо заводить отдельный пресет.

Проверено (`rm -rf libs/*/dist apps/*/dist`, `nx run-many -t typecheck:tsgo --skip-nx-cache` на
всех 19 потребителей + `nx build` на `aboi`/`driving-school`/`kami`): типов не отличается от
построчного варианта. Единственные два typecheck-фейла (`form-example` — TS2339 на несвежий
Prisma-клиент, `grandslamcup` — TS2339 на `webkitRequestFullscreen`) воспроизвелись одинаково и
со старым построчным `rootDir`, и без него вовсе — не связаны с этой правкой.

## `form-docs` — 20-е приложение на пресете (закрыт хвост §43, 2026-08-07)

Ещё один пропуск того же рода, что и `form-example` (не решение, а недосмотр): наследовался от
`tsconfig.base.json` напрямую вместо общего пресета. В отличие от `form-example`, здесь не было
`composite`-проблемы — вся разница компилятора (`jsx`, `lib`, `module`, `moduleResolution`,
`plugins`, `noEmit`, `ignoreDeprecations` и т.д.) была **побайтово идентична** тому, что даёт
пресет через `tsconfig.base.json`, — приложение просто дублировало настройки пресета вручную,
плюс была случайно задублирована одна и та же запись `@letar/forms` в `paths`.

Особенность `form-docs` — Fumadocs (fumadocs-mdx). Реальные исходники лежат в `src/**`, как у
любого Next.js-приложения на пресете, но добавляются два нестандартных источника типов:
`source.config.ts` в корне приложения (конфиг Fumadocs, не под `src/`) и генерируемый каталог
`.source/` (`browser.ts`, `dynamic.ts`, `server.ts` — типы для MDX-контента, создаются
`fumadocs-mdx` при `next dev`/`next build`, в `.gitignore`). Оба добавлены в `include` рядом со
стандартным `src/**/*` — `"source.config.ts"` и `".source/**/*.ts"`.

Перевод — `extends: tsconfig.next-app.json`, в `apps/form-docs/tsconfig.json` остались только
`paths` (без дубля) и расширенный `include`. Проверено `typecheck:tsgo` и `nx build` — оба
проходят чисто, без побочных эффектов из списка `form-example`/`dashboard-agent` (`TS6059`
не возникло, потому что старый `tsconfig.base.json` уже не резолвил его иначе — старое
наследование и так шло без `references`, `TS6307` тоже не появился по той же причине).

## `form-example` — 19-е приложение на пресете (закрыт пробел §31, 2026-08-04)

Не попал ни в 18 переведённых в §31, ни в 13 исключений ниже — простой пропуск, не решение.
Наследовался от `tsconfig.base.json` напрямую (см. `libs/forms` §37 в `PLAN.md` про `TS6307`
от голого `composite: true`), из-за чего архитектурно стоял вне пресета до этой правки.

Перевод на пресет (`extends: tsconfig.next-app.json`, только `paths`+`references` в
`apps/form-example/tsconfig.json`) вскрыл вторую, отдельную от `composite`, проблему:
**`references` обязаны перечислять КАЖДУЮ `@letar/*`-либу, задействованную через `paths` с
прямой ссылкой на исходник**, а не только те, что случайно там оказались. У `form-example`
`references` содержал `demo-protection` и `analytics`, но не `forms` — притом что `forms` тоже
маппился в `paths`. Как только пресет включил `outDir`/`tsBuildInfoFile` (у голого
`tsconfig.base.json`-наследования их не было), `tsgo` начал строго считать `rootDir` этого
проекта и уронил 245× `TS6059` — файлы `libs/forms/src/**` оказались вне вычисленного
`rootDir` `apps/form-example`, потому что тянулись как обычные исходники, а не как ссылка на
чужой composite-проект. Починка — добавить `{ "path": "../../libs/forms" }` в `references`,
по образцу `archetest` (там `forms` уже был в списке).

**Общее следствие:** при переносе любого приложения на пресет — сверять `paths` и `references`
построчно, не только копировать структуру. Пропущенная `references`-запись при живом `paths`
на реальный `.ts`-исходник — не ошибка компиляции сама по себе, она молчит, пока в конфиге нет
`outDir` (поэтому три сессии в §37 её не заметили — `outDir` появился только вместе с
пресетом).

Проверено `tsgo --listFiles` до/после: разница — ровно `next.config.ts` и `prisma.config.ts`
(корневые файлы вне `src/`, не покрытые `include`-паттерном пресета `${configDir}/src/**/*`).
Это не сужение специфичное для `form-example` — `auth-hub` и `dashboard`, уже стоящие на
пресете, имеют собственный `next.config.ts` и точно так же не типизируют его (`--listFiles` не
содержит файл ни у одного из них). Тот же принцип применён к `prisma.config.ts` (18 приложений
на пресете его имеют, ни у одного не типизируется).

## Приложения вне пресета (осознанно, законные отличия)

Проверено `output: 'standalone'`/`'export'` в `next.config.*` и структуру каталогов:

- **Лендинги на `create-next-app`-конфиге** (`animatrona-landing`, `kami-key-the-landing`,
  `letar-landing`, `synth`) — не Nx-generated структура (`**/*.ts` вместо `src/**/*.ts`,
  `moduleResolution: "bundler"`, `target: "ES2017"`). Уже 100% единообразны между собой
  (проверено — 0 расхождений в `compilerOptions`), отдельный пресет для них не заводился,
  так как группа маленькая (4 приложения) и не растёт.
- **Electron-стек** (`animatrona`, `label-printer-desktop`, `poster-microtext-desktop`,
  `kami-key-the`) — `target: ES2022`, `module: ESNext`, свои `include` на `main/renderer/shared`
  и библиотеки. `kami-key-the` дополнительно отличается от трёх остальных (нет `renderer/`,
  `sourceMap: true` вместо `incremental`) — не унифицирован намеренно, приложение младше и ещё
  формируется.
- **React Native** (`animatrona-mobile`, `animatrona-tv`) — наследуют
  `@react-native/typescript-config`, к Next.js-пресету не относятся в принципе.
- **`dashboard-agent`** — bare Node-сервис (BullMQ worker), не Next.js, свой минимальный конфиг.
- **`pravda`** — `output: isProduction ? 'export' : undefined` (условный static export), но на
  уровне `tsconfig.json` не отличается от обычных Next-приложений — вошёл в общий пресет.

## `tsgo`-специфика (используется вместо `tsc` в таргете `typecheck:tsgo`)

`nx.json`/`project.json` → таргет `typecheck:tsgo` (`tsgo --noEmit`, 9–38x быстрее `tsc`).
Его `inputs` включают `{workspaceRoot}/tsconfig.base.json` — при добавлении
`tsconfig.next-app.json` как промежуточного слоя не забыть: Nx инвалидирует кэш только по явно
перечисленным входным файлам, а не по всей цепочке `extends`. Если в будущем `tsconfig.next-app.json`
не попадёт в `inputs`, правка пресета не будет сбрасывать кэш типов у приложений.

## Регенерация замера расхождений

```bash
node -e '
const fs=require("fs");
const apps=fs.readdirSync("apps").filter(a=>fs.existsSync(`apps/${a}/tsconfig.json`) && !a.endsWith("-e2e"));
const sig={};
for(const a of apps){
  const j=JSON.parse(fs.readFileSync(`apps/${a}/tsconfig.json`,"utf8"));
  const c={...j.compilerOptions}; delete c.paths;
  const k=JSON.stringify({c,include:j.include,exclude:j.exclude});
  (sig[k]=sig[k]||[]).push(a);
}
console.log("приложений:",apps.length,"| различных блоков:",Object.keys(sig).length);
'
```
