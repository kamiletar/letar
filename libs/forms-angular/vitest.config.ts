/// <reference types="vitest" />
import { buildFormsCoreAlias } from '@letar/forms-core/testing'
import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

const formsCoreAlias = buildFormsCoreAlias(resolve(__dirname, '../forms-core'))

/**
 * Angular не даёт executor'а под Vitest (в отличие от Jest/Karma) — TestBed запускается вручную
 * через `@angular/platform-browser/testing` + `@angular/core/testing`, JIT-компиляция включается
 * побочным импортом `@angular/compiler` в `vitest.setup.ts`. Разведка (Фаза 10 `libs/forms/PLAN.md`)
 * подтвердила: связка zoneless (`provideZonelessChangeDetection`) + `TestBed` + Vitest+jsdom
 * реально рендерит и тестирует standalone-компоненты без Karma и без zone.js.
 */
export default defineConfig({
  cacheDir: '../../node_modules/.vitest/forms-angular',
  root: __dirname,
  // Vite 8 трансформирует `.ts` через `oxc` по умолчанию (не esbuild) — `esbuild.tsconfigRaw`
  // тихо игнорируется («Both esbuild and oxc options were set»). Angular-декораторы
  // (`@Component`, `@Injectable`, `@Directive`) — legacy TS decorators; на 2026-08-13 не нашли
  // публичного эквивалента `experimentalDecorators` в `OxcOptions` этой версии `vite`/`rolldown` —
  // отключаем `oxc` целиком (`oxc: false`), тогда транформация падает обратно на `esbuild`,
  // который понимает декораторы через `tsconfigRaw`.
  oxc: false,
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        // ⚠️ Не `false`: сигнальные `input()`/`output()` (Angular 17+) требуют настоящих ES
        // class fields (`Object.defineProperty`-семантика), иначе JIT-компилятор не находит их
        // на «голом» инстансе при построении карты inputs/outputs — `NG0303: Can't bind to ...`.
        // Старая рекомендация "decorators ⇒ useDefineForClassFields:false" была верна для
        // legacy `@Input()`, но не для сигнальных API.
        useDefineForClassFields: true,
      },
    },
  },
  test: {
    name: '@letar/forms-angular',
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/libs/forms-angular',
      reporter: ['text', 'json', 'html'],
    },
    clearMocks: true,
    restoreMocks: true,
  },
  resolve: {
    alias: formsCoreAlias,
  },
})
