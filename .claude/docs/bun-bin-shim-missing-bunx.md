# Bun на Windows: `could not find bin metadata file` у `nx dev <app>`

**Симптом (2026-10-08).** `nx dev <app>` и `preview_start` завершаются с кодом 0 через ~5 секунд.
В выводе: `error: could not find bin metadata file. Bun failed to remap this bin to its proper
location within node_modules. This is an indication of a corrupted node_modules directory`.
Порт не слушается, процесс Next.js не стартовал.

## Причина

Bun на Windows кладёт в `node_modules/.bin/` не `.cmd`, а пару файлов:

- `<name>.exe` — одинаковый для всех bin крошечный шим (8 КБ);
- `<name>.bunx` — метаданные: куда шиму идти.

Шим без парного `.bunx` падает с этой ошибкой. Для `next` пара оказалась неполной: `next.exe` был, а
`next.bunx` — нет (у остальных 41 шимов он есть). Диагностика одной командой:

```bash
for f in node_modules/.bin/*.exe; do [ -f "${f%.exe}.bunx" ] || echo "нет .bunx: $f"; done
```

**Это не проблема `project.json`.** Цель `dev` выводится плагином `@nx/next` (`nx.json` →
`devTargetName: "dev"`) как `next dev` с `cwd` приложения; `nx` ищет `next` в `node_modules/.bin`.
Менять команду в одном приложении бессмысленно: шим общий, сломаны были бы все Next-приложения.
Чем именно был потерян `next.bunx` — неизвестно (файлы `.exe` и остальные `.bunx` пересозданы в
одну минуту, этого одного не оказалось).

## Починка без `bun install --force`

`bun install --force` в общем чекауте затрагивает `node_modules` всех приложений, пока в нём
работают другие агенты, — не запускать без решения владельца. Достаточно добавить один недостающий
файл. Формат `.bunx` (UTF-16LE, подтверждён побайтно на `nx`, `nextron`, `oxlint`, `prisma`,
`playwright`):

```
<путь к скрипту относительно node_modules, разделитель \> "  NUL  node  <символ с кодом 2*длина_пути> NUL  \n  NUL  0x37 0xAB
```

Для `next` путь — `next\dist\bin\next` (18 символов → символ с кодом 36, `$`):

```js
const p = ['next', 'dist', 'bin', 'next'].join(String.fromCharCode(92))
const buf = Buffer.concat([
  Buffer.from(p + '"\0node ' + String.fromCharCode(p.length * 2) + '\0\n\0', 'utf16le'),
  Buffer.from([0x37, 0xab]),
])
require('node:fs').writeFileSync('node_modules/.bin/next.bunx', buf)
```

Проверка: `node_modules/.bin/next.exe --version` из каталога приложения, затем `nx dev <app>`.
Для другого bin подставь его путь из `"bin"` в `package.json` пакета.

⚠️ Файл лежит в `node_modules` и пропадёт при следующем `bun install` с пересозданием bin — тогда
Bun обычно пишет пару заново и проблема уходит сама; если нет, повтори шаг. Обход на один запуск:
`node ../../node_modules/next/dist/bin/next dev -p <порт>` из каталога приложения.

⚠️ При правке команд через Bash-инструмент обратные слэши в `node -e "..."` и heredoc могут
схлопываться — путь собирай через `String.fromCharCode(92)`, как выше.
