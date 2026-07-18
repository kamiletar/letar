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
