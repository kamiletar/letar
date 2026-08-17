import nx from '@nx/eslint-plugin'

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/.next',
      '**/out-tsc',
      '**/prisma/generated',
      '**/zod',
      '**/test-output',
      '**/src/generated',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: [
            '^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$',
            // Animatrona: shared types между main/renderer (относительные пути)
            '^(\\.\\./)+shared(/.*)?$',
            // Animatrona: generated Prisma client из renderer (для main process)
            '^(\\.\\./)+renderer/src/generated(/.*)?$',
            // Animatrona: ZenStack schema
            '^(\\.\\./)+schema$',
            // External packages that lint incorrectly flags
            '^shaka-player$',
            '^dompurify$',
          ],
          depConstraints: [
            // Shared библиотеки могут зависеть только от других shared
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            // Приложения могут зависеть от shared и своих scoped библиотек
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'scope:shared',
                'scope:label-printer',
                'scope:driving-school',
                'scope:animatrona',
              ],
            },
            // TV приложения могут зависеть от shared библиотек
            {
              sourceTag: 'type:tv',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            // Мобильные приложения могут зависеть от shared библиотек
            {
              sourceTag: 'type:mobile',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
            // Label-printer scope может зависеть от своих и shared
            {
              sourceTag: 'scope:label-printer',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:label-printer'],
            },
            // Driving-school scope может зависеть от своих и shared
            {
              sourceTag: 'scope:driving-school',
              onlyDependOnLibsWithTags: ['scope:shared', 'scope:driving-school'],
            },
            // Граница владения (Этап 0.5 PLAN.md): личные петы/инфра letar не должны
            // импортировать коммерческий код. Зависят только от shared и других owner:letar.
            // Обратная сторона (owner:commercial) включится после тегирования submodules.
            {
              sourceTag: 'owner:letar',
              onlyDependOnLibsWithTags: ['scope:shared', 'owner:letar'],
            },
            // UI компоненты не должны зависеть от data-access напрямую
            // (закомментировано - form-components может нуждаться в исключениях)
            // {
            //   sourceTag: 'type:ui',
            //   notDependOnLibsWithTags: ['type:data-access'],
            // },
            // Фаза 7.1 (@letar/forms-core): dependency-free ядро не зависит от UI-слоя.
            // Зависимость идёт внутрь (Clean Architecture / DIP) — @letar/forms (type:ui)
            // зависит от ядра, не наоборот. Само по себе это правило не ловит внешние
            // npm-импорты (react/@chakra-ui) внутри ядра — для них см. блок
            // `**/forms-core/src/**/*.ts` ниже с `no-restricted-imports`.
            {
              sourceTag: 'type:core',
              notDependOnLibsWithTags: ['type:ui', 'type:core-react'],
            },
            // Фаза 7.3 (@letar/forms-react): композиционный слой форм между ядром и скинами.
            // Знает React и TanStack Form, но не знает ни одной UI-библиотеки — конкретные
            // примитивы приходят снаружи через UIKit-контракт. Тот же приём, что и строкой
            // выше: npm-импорты (@chakra-ui и т.п.) это правило не ловит, для них —
            // блок `**/forms-react/src/**` с `no-restricted-imports` ниже.
            {
              sourceTag: 'type:core-react',
              notDependOnLibsWithTags: ['type:ui'],
            },
          ],
        },
      ],
    },
  },
  // === Границы точек входа внутри одной библиотеки ===
  // `@nx/enforce-module-boundaries` работает на уровне ПРОЕКТА: клиентская и серверная
  // части одной библиотеки (`@letar/x` и `@letar/x/server`) для него один и тот же узел
  // графа, теги их не различают. Поэтому границу между `src/server/` и остальным кодом
  // библиотеки держат правила ниже. Подробнее: .claude/docs/lib-entry-points.md
  //
  // ⚠️ Глобы намеренно начинаются с `**/`. 58 проектов имеют свой `eslint.config.mjs`,
  // который спредит этот массив, а ESLint 10 считает `files` относительно ТОГО файла.
  // Путь вида `libs/*/src/server/**` там превратится в `libs/x/libs/*/src/server/**`
  // и молча ничего не поймает.
  {
    files: ['**/src/server/**/*.ts', '**/src/server/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message:
                'src/server/ — Node-only точка входа. React здесь утяжеляет серверный бандл и ломает потребителей без React.',
              allowTypeImports: true,
            },
            {
              name: 'react-dom',
              message: 'src/server/ — Node-only точка входа, react-dom сюда не тянем.',
              allowTypeImports: true,
            },
            {
              name: '@chakra-ui/react',
              message: 'src/server/ — Node-only точка входа, Chakra сюда не тянем.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // === @letar/forms-core — dependency-free ядро (Фаза 7.1) ===
  // `@nx/enforce-module-boundaries` (выше) не видит внешние npm-импорты вообще — граница
  // «ядро не тянет ни один фреймворк» (решение Ками, 2026-07-08) держится только здесь.
  // ⚠️ Глоб с `**/` по той же причине, что и `src/server/` выше — см. комментарий там.
  {
    files: ['**/forms-core/src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              message: '@letar/forms-core не импортирует ни один фреймворк — React-адаптер над ядром, не наоборот.',
            },
            {
              name: 'react-dom',
              message: '@letar/forms-core не импортирует ни один фреймворк — React-адаптер над ядром, не наоборот.',
            },
          ],
          patterns: [
            {
              group: ['@chakra-ui/*', '@tanstack/react-*', 'react-icons/*'],
              message: '@letar/forms-core не импортирует ни один фреймворк — React-адаптер над ядром, не наоборот.',
            },
          ],
          // allowTypeImports намеренно не ставим: ядро должно быть чистым и по типам тоже.
        },
      ],
    },
  },
  // === @letar/forms-react — UI-library-free композиционный слой (Фаза 7.3) ===
  // Отличие от `forms-core` выше: React и TanStack Form здесь РАЗРЕШЕНЫ — это React-пакет.
  // Запрещены конкретные UI-библиотеки: всё, что рисует, приходит через UIKit-контракт
  // параметром, иначе Chakra снова окажется зашита в сборку поля и второй скин (shadcn)
  // будет вынужден дублировать композиционный слой вместо переиспользования.
  // ⚠️ Глоб с `**/` по той же причине, что и `src/server/` выше — см. комментарий там.
  {
    files: ['**/forms-react/src/**/*.ts', '**/forms-react/src/**/*.tsx'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@chakra-ui/*', '@ark-ui/*', '@radix-ui/*', 'react-icons/*', 'lucide-react'],
              message:
                '@letar/forms-react не знает ни одной UI-библиотеки — примитивы приходят через UIKit-контракт из @letar/forms-core/uikit. Реализация примитива — дело скина (@letar/forms, @letar/forms-shadcn).',
            },
            {
              group: ['@letar/forms', '@letar/forms/*', '@letar/forms-shadcn', '@letar/forms-shadcn/*'],
              message:
                'Зависимость идёт от скина к композиционному слою, не наоборот (DIP). Нужное из скина — принимай параметром.',
            },
          ],
          // allowTypeImports не ставим: тип из Chakra в сигнатуре — та же протечка границы,
          // просто отложенная до момента, когда её кто-то попробует реализовать на shadcn.
        },
      ],
    },
  },
  // === @letar/forms-vue/core — композиционный слой без конкретных полей (Фаза 9) ===
  // Vue-аналог `forms-react`: `AppForm`/`createField`/`useAppFormContext`, но без референсных
  // HTML-полей (`src/lib/fields/**`). Граница — подпуть экспорта `./core`, проверяемая, не
  // подразумеваемая: `forms-vue-shadcn` импортирует именно его, не корневой `.`, и не должен
  // получить голую HTML-разметку полей транзитивно. Решение координатора форм, 2026-08-13.
  {
    files: ['**/forms-vue/src/core.ts', '**/forms-vue/src/lib/core/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/fields/*', '../fields/*', './fields/*'],
              message:
                '@letar/forms-vue/core — общая обвязка формы, не должна знать о конкретных полях. Полям положено импортировать core, не наоборот — иначе граница с forms-vue-shadcn размоется.',
            },
          ],
        },
      ],
    },
  },
  {
    // `**/src/client.ts` и `**/src/ui/**/*.tsx` — точка входа `@letar/cdek/client` не
    // папка, а один файл, реэкспортирующий `src/ui/*`; без этих двух глобов клиентский
    // код cdek выпадает из-под правила ниже. См. .claude/docs/lib-entry-points.md.
    files: [
      '**/src/client/**/*.ts',
      '**/src/client/**/*.tsx',
      '**/src/client.ts',
      '**/src/lib/**/*.tsx',
      '**/src/ui/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Только `@letar/*/server` и относительные пути. Голый `**/server` ловил бы
              // `next-intl/server` и `@/types/server` — сотни ложных срабатываний.
              group: [
                '@letar/*/server',
                '@letar/*/server/*',
                './server',
                './server/*',
                '../server',
                '../server/*',
                '../../server',
                '../../server/*',
              ],
              message:
                'Клиентский код библиотеки не должен импортировать её серверную точку входа: node:fs/node:path попадут в браузерный бандл. Нужен только тип — используй `import type`.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
  // === NODE_ENV === 'production' — не признак прод-окружения ===
  // `next build`/`next start` ВСЕГДА выставляет NODE_ENV=production — в том числе на
  // staging-сборках и на обычном `nx build <app>` разработчика. Три инцидента (открытый
  // ALLOW_DEV_SESSION-бэкдор, противоречивая индексация aboi, упавшая сборка kami
  // keystatic.config.ts) — разбор в .claude/docs/node-env-not-production-signal.md.
  // Замена для decision-веток (индексация/бэкдоры/креды/фичефлаги) — проверка явного
  // домена (`isProductionDomain()`-паттерн из libs/seo, если применимо) или наличия нужного
  // credential/конфига (`Boolean(process.env.SOME_CRED)`), а не NODE_ENV.
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/^(===|!==)$/][left.type='MemberExpression'][left.property.name='NODE_ENV'][left.object.property.name='env'][left.object.object.name='process'][right.type='Literal'][right.value='production']",
          message:
            "NODE_ENV === 'production' не отличает прод от staging/dev-сборки — next build всегда ставит production. См. .claude/docs/node-env-not-production-signal.md. Замена: проверка явного домена (isProductionDomain) или наличия credential/конфига.",
        },
        {
          selector:
            "BinaryExpression[operator=/^(===|!==)$/][right.type='MemberExpression'][right.property.name='NODE_ENV'][right.object.property.name='env'][right.object.object.name='process'][left.type='Literal'][left.value='production']",
          message:
            "NODE_ENV === 'production' не отличает прод от staging/dev-сборки — next build всегда ставит production. См. .claude/docs/node-env-not-production-signal.md. Замена: проверка явного домена (isProductionDomain) или наличия credential/конфига.",
        },
      ],
    },
  },
  // Allow-list: build-тулинг, где NODE_ENV задаётся explicit самим тулингом сборки
  // (electron-builder/cross-env/webpack), а не расползается из `next build` в рантайм —
  // сравнение здесь корректно по своей природе.
  {
    files: [
      '**/next.config.js',
      '**/next.config.mjs',
      '**/next.config.cjs',
      '**/main/webpack.config.js',
      '**/generators/electron-app/files/**',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Allow-list: Electron main-процесс — не Next.js рантайм, границы прод/стейджа не
  // существует в принципе. Первичный сигнал — `app.isPackaged`, NODE_ENV только fallback
  // (проверено на месте перед allow-list, .claude/docs/node-env-not-production-signal.md).
  {
    // Два варианта одного пути: часть проектов резолвит `files` от cwd=каталог приложения
    // (голый `main/**`), часть — от корня репо через явный `lintFilePatterns` в project.json
    // (`apps/*/main/**`, см. `apps/animatrona/project.json`). Нужны оба, иначе allow-list
    // работает не для всех приложений сразу — см. комментарий у следующего блока.
    files: ['main/**/*.ts', 'apps/*/main/**/*.ts'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  // Allow-list: разобранные точечно случаи, где паттерн безопасен (проверено 2026-08-12,
  // см. .claude/docs/node-env-not-production-signal.md § Ревизия ESLint-правила):
  // — `secure: NODE_ENV === 'production'` для cookie — корректно для ЛЮБОЙ собранной
  //   сборки (staging тоже https), доменное различие тут не нужно;
  // — Prisma/Pool dev-singleton-cache (`if (NODE_ENV !== 'production') globalForX.x = x`) —
  //   стандартный паттерн из документации Prisma, на staging просто не кэширует (безвредно);
  // — выбор backend для rate-limit storage (database/memory) — не security-decision;
  // — dev-only console.error/debug-панели в @letar/forms — тише на staging, не риск.
  {
    files: [
      // ⚠️ Два варианта каждого пути — см. комментарий у allow-list `main/**` блока выше:
      // одни проекты (nx:run-commands `eslint .`, cwd=каталог приложения) резолвят `files`
      // от каталога приложения — нужен голый project-relative путь без имени app/lib. Другие
      // (`@nx/eslint:lint` executor с явным `lintFilePatterns` в project.json, см.
      // `apps/animatrona/project.json`) резолвят от корня репо — нужен путь с `apps/*/`/
      // `libs/*/`. Совпадения project-relative путей между проектами (несколько
      // `src/lib/prisma.ts`) осознанные и безопасные: каждый матчащийся файл уже разобран
      // точечно, см. .claude/docs/node-env-not-production-signal.md § Ревизия ESLint-правила.
      'src/lib/db.ts',
      'apps/*/src/lib/db.ts',
      'src/app/api/oidc-capture/route.ts',
      'apps/*/src/app/api/oidc-capture/route.ts',
      'src/app/api/auth/oauth2/authorize/route.ts',
      'apps/*/src/app/api/auth/oauth2/authorize/route.ts',
      'src/app/*/_components/service-worker-registration.tsx',
      'apps/*/src/app/*/_components/service-worker-registration.tsx',
      'src/app/*/dev/layout.tsx',
      'apps/*/src/app/*/dev/layout.tsx',
      'src/app/*/(auth)/_actions/verify-login.action.ts',
      'apps/*/src/app/*/(auth)/_actions/verify-login.action.ts',
      'src/app/(auth)/_actions/verify-login.action.ts',
      'apps/*/src/app/(auth)/_actions/verify-login.action.ts',
      'src/lib/prisma.ts',
      'apps/*/src/lib/prisma.ts',
      'src/index.ts',
      'apps/*/src/index.ts',
      'src/instrumentation.ts',
      'apps/*/src/instrumentation.ts',
      'src/lib/auth.ts',
      'apps/*/src/lib/auth.ts',
      'src/server/create-auth/index.ts',
      'libs/*/src/server/create-auth/index.ts',
      'src/lib/declarative/form-debug-values.tsx',
      'libs/*/src/lib/declarative/form-debug-values.tsx',
      'src/lib/declarative/form-fields/utility/use-computed-value.ts',
      'libs/*/src/lib/declarative/form-fields/utility/use-computed-value.ts',
      'src/lib/fields/use-computed-value.ts',
      'libs/*/src/lib/fields/use-computed-value.ts',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
    rules: {
      // TypeScript specific
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
          disallowTypeAnnotations: false,
        },
      ],

      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },
  // Seed, скрипты, тесты — разрешаем console.log
  {
    files: [
      '**/seed.ts',
      '**/test-*.ts',
      '**/scripts/**',
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/fixtures/**',
      '**/helpers/**',
      '**/deploy-engine/src/cli.ts',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  // Тесты/бенчмарки/тестовые утилиты — пустые моки (IntersectionObserver, no-op колбэки)
  // легитимны и не являются багом, в отличие от того же паттерна в боевом коде
  {
    files: [
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.bench.tsx',
      '**/__tests__/**',
      '**/lib/testing/**',
    ],
    rules: {
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  // Playwright e2e — отключаем шумные правила
  {
    files: ['**/*.spec.ts'],
    rules: {
      'playwright/no-wait-for-timeout': 'off',
      'playwright/no-skipped-test': 'off',
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/prefer-locator': 'off',
      'playwright/no-force-option': 'off',
      'playwright/expect-expect': 'off',
      'playwright/no-wait-for-selector': 'off',
    },
  },
]
