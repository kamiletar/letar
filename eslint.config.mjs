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
    ],
    rules: {
      'no-console': 'off',
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
