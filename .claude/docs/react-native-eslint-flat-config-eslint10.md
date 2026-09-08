# ESLint для React Native под ESLint 10: пресет `@react-native/eslint-config` не подключается

**Найдено:** 2026-09-08, при заведении линта для `apps/animatrona-mobile` (RN 0.87.1, ESLint 10.9.1).

## Короткая версия

Очевидный ход — «взять `@react-native/eslint-config` из корневого `package.json` и спредить его
в конфиг приложения» — **не работает**. Пресет роняет весь прогон ESLint. Рабочая форма конфига
для RN-приложения этого монорепо — внизу.

## ⚠️ Ловушка 1: пресет роняет прогон целиком, а не «шумит правилами»

```js
import reactNativeConfig from '@react-native/eslint-config/flat'
export default [...reactNativeConfig, ...baseConfig]
```

```
Oops! Something went wrong! :(
TypeError: Error while loading rule 'eslint-comments/no-aggregating-enable':
  context.getSourceCode is not a function
```

Причина: пресет тянет `eslint-plugin-eslint-comments@3.2.0`, который зовёт удалённый в ESLint 10
`context.getSourceCode()`. Это **не** «одно правило сломалось» — падает загрузка правила, значит
падает линт всего файла, значит exit≠0 на любом файле. Ноль полезной работы.

Тот же дефект у `eslint-plugin-react-native@5.0.0` (`lib/util/Components.js`) — а это ровно те
правила, ради которых RN-пресет обычно и берут:

| Правило                                       | Статус на ESLint 10       |
| --------------------------------------------- | ------------------------- |
| `react-native/no-unused-styles`               | ❌ недоступно             |
| `react-native/no-inline-styles`               | ❌ недоступно             |
| `react-native/no-color-literals`              | ❌ недоступно             |
| `react-native/split-platform-components`      | ❌ недоступно             |
| `react-native/no-single-element-style-arrays` | ❌ недоступно             |
| `@react-native/no-deep-imports`               | ✅ работает               |
| `@react-native/platform-colors`               | ✅ работает (не включали) |

Сигнал был виден заранее и не в логе ESLint, а в `bun scripts/check-all.mjs --group=deps`:

```
@react-native/eslint-config требует eslint@^8.0.0 || ^9.0.0, установлен 10.9.1
```

Проверка `peer-deps` имеет уровень **отчёт**, а не gate, поэтому строка годами лежит в «фоновом
шуме» и коммит не блокирует. Здесь она была точным диагнозом. Лечится только апдейтом плагинов
апстримом — перепроверять при `deps update`.

## ⚠️ Ловушка 2: рабочий плагин не резолвится голым импортом (bun isolated linker)

`@react-native/eslint-plugin` — **транзитивная** зависимость `@react-native/eslint-config`, не
прямая зависимость репозитория. В корневом `node_modules` его нет:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@react-native/eslint-plugin'
```

Обход — `createRequire` от entry-файла пакета-родителя, тот же приём, что описан в
[nested-package-resolution-under-bun-isolated-installs](/.claude/docs/nested-package-resolution-under-bun-isolated-installs.md):

```js
const requireFromRnConfig = createRequire(import.meta.resolve('@react-native/eslint-config/flat'))
const reactNativeMetaPlugin = requireFromRnConfig('@react-native/eslint-plugin')
```

Альтернатива — добавить плагин прямой зависимостью в корневой `package.json`; не делали, чтобы
не двигать `bun.lock` ради одного правила.

## Рабочая форма

Живой образец — `apps/animatrona-mobile/eslint.config.mjs`. Состав:

1. `...nx.configs['flat/react-typescript']` — 16 правил `react/*` (без `react/prop-types`, на TS
   он не нужен);
2. `...baseConfig` (корневой `eslint.config.mjs`) — оттуда же приезжает `eslint-plugin-react-hooks`,
   зарегистрированный централизованно (см.
   [eslint-flat-react-typescript-missing-react-hooks-plugin](/.claude/docs/eslint-flat-react-typescript-missing-react-hooks-plugin.md));
3. глобалы рантайма RN (`__DEV__`, `ErrorUtils`, `__fbBatchedBridgeConfig`, …) — переписаны руками
   из `@react-native/eslint-config/shared.js`, потому что сам пресет подключить нельзя;
4. плагин `@react-native` с правилом `no-deep-imports`;
5. `ignores`: `android/**`, `ios/**`, `dist/**`, `build/**`, `.bundle/**`, `vendor/**`.

**Класть копию в каждое RN-приложение, не в корневой конфиг.** Корневой `eslint.config.mjs`
спредится во все ~58 проектов монорепо — `@react-native/no-deep-imports` начнёт грузиться там,
где react-native нет вовсе.

## Что ещё нужно, кроме файла конфига

Сам по себе `eslint.config.mjs` таргет `lint` не чинит, если в `project.json` лежит блок из одних
`options` без `executor` — см.
[nx-target-without-executor-silent-noop](/.claude/docs/nx-target-without-executor-silent-noop.md).
Правильная связка (как у `animatrona-tracker`):

```json
"oxlint": { "executor": "nx:run-commands", "options": { "command": "bunx oxlint src --config ../../.oxlintrc.json", "cwd": "apps/<app>" } },
"lint": { "dependsOn": ["oxlint"] }
```

Сам `eslint .` приезжает inferred-таргетом от `@nx/eslint/plugin`.

## Как проверять, что линт правда работает

⚠️ «Successfully ran target lint» ничего не доказывает. Проверять числом файлов:

```bash
cd apps/<app> && npx eslint . -f json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('files:',JSON.parse(s).length))"
```

Плюс позитивный тест конкретного RN-правила: временный файл с
`import { Text } from 'react-native/Libraries/Text/Text'` обязан дать
`error @react-native/no-deep-imports`.
