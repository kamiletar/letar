# Unit-тестирование (Vitest)

Паттерны конфигурации Vitest в монорепо. E2E — см. [e2e-testing](/.claude/docs/e2e-testing.md).

## ⚠️ Vite 8.1.3+ (oxc): tsconfig-покрытие обязательно для каждого файла

**Симптом:** все unit-сьюты приложения падают до запуска тестов с ошибкой:

```
[TSCONFIG_ERROR] Failed to load tsconfig for 'vitest.setup.tsx': Tsconfig not found
  Plugin: vite:oxc
```

**Причина:** с vite 8.1.3 (обновление зависимостей `a1ffb4e`, 2026-07-07; до этого vitest
использовал вложенный vite 8.0.16) oxc-трансформер `vite:oxc` резолвит tsconfig **per-file**:
файл должен быть покрыт `include` ближайшего `tsconfig.json` **или одного из его project
references** — иначе трансформация падает. В Next.js-приложениях монорепо тестовые файлы
и `vitest.setup.tsx` намеренно исключены из `tsconfig.json` (чтобы `next build`/typecheck
их не видел), поэтому после обновления все сьюты сломались.

Опция `oxc.tsconfig: false` намеренно исключена из публичного типа `OxcOptions` vite —
обход через каст не используем.

**Фикс (образец — `apps/archetest/`, commit `ffd20a8`):**

1. **`tsconfig.spec.json`** рядом с `tsconfig.json` приложения:

   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "composite": true,
       "noEmit": false,
       "emitDeclarationOnly": true,
       "outDir": "./out-tsc/spec",
       "tsBuildInfoFile": "./out-tsc/spec/tsconfig.spec.tsbuildinfo",
       "jsx": "react-jsx",
       "types": ["vitest/globals", "node"]
     },
     "include": [
       "vitest.config.ts",
       "vitest.setup.tsx",
       "src/**/*.test.ts",
       "src/**/*.spec.ts",
       "src/**/*.test.tsx",
       "src/**/*.spec.tsx",
       "src/**/*.d.ts"
     ],
     "exclude": ["out-tsc", "dist", "node_modules", ".next"]
   }
   ```

2. **Reference из корневого `tsconfig.json`** приложения (первым в списке):

   ```json
   "references": [{ "path": "./tsconfig.spec.json" }, ...]
   ```

**Три подводных камня:**

- **`exclude` наследуется через `extends`** — если его не переопределить в
  `tsconfig.spec.json`, унаследованный exclude корневого tsconfig (`src/**/*.test.ts` и
  т.п.) продолжит исключать тесты, и ошибка останется. Явный `exclude` обязателен.
- **Без reference файл не найдётся** — резолвер oxc ищет только `tsconfig.json` по имени
  и ходит по его `references`. Просто положить `tsconfig.spec.json` рядом недостаточно
  (у kami/dashboard/driving-school/mandala такие файлы были — не помогали).
- **`composite: true` + `noEmit: false` + `emitDeclarationOnly: true` обязательны** —
  иначе `typecheck:tsgo` падает: TS6310 (referenced project may not disable emit) и
  TS6377 (конфликт tsbuildinfo).

**Проверка после фикса:** `nx test <app>` + `nx lint <app>` + `nx typecheck:tsgo <app>`.

**Статус тиража (2026-07-07):** archetest ✅; kami, dashboard, driving-school, mandala и
остальные приложения с vitest — не мигрированы (падают при первом же прогоне тестов).

## Диагностика: nx прячет вывод vitest

`nx test <app>` при падении executor'а может не показывать вывод vitest даже с `--verbose`.
Запускай vitest напрямую из папки приложения:

```powershell
Set-Location apps/<app>; bun run vitest run
```
