# CI/CD Pipeline

## GitHub Actions для монорепо

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  setup:
    runs-on: ubuntu-latest
    outputs:
      affected: ${{ steps.affected.outputs.apps }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Get affected apps
        id: affected
        run: |
          AFFECTED=$(bunx nx show projects --affected --type=app --json)
          echo "apps=$AFFECTED" >> $GITHUB_OUTPUT

  lint-and-type:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - name: Lint affected
        run: bunx nx affected -t lint

      - name: Type check affected
        run: bunx nx affected -t typecheck:tsgo

  test:
    needs: setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - name: Test affected
        run: bunx nx affected -t test

  build:
    needs: [lint-and-type, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - name: Build affected
        run: bunx nx affected -t build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1

  e2e:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - run: bun install --frozen-lockfile

      - name: Install Playwright
        run: bunx playwright install --with-deps webkit

      - name: Run E2E tests
        run: bunx nx affected -t e2e
```

## Деплой на production

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      app:
        description: 'App to deploy (leave empty for affected)'
        required: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}

      - name: Add host to known_hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ secrets.SERVER_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to server
        env:
          SERVER_HOST: ${{ secrets.SERVER_HOST }}
          SERVER_USER: ${{ secrets.SERVER_USER }}
          APP: ${{ github.event.inputs.app }}
        run: |
          ssh $SERVER_USER@$SERVER_HOST << 'EOF'
            cd /var/www/lena
            git pull origin main
            if [ -n "$APP" ]; then
              ./deploy-affected.sh --app "$APP"
            else
              ./deploy-affected.sh
            fi
          EOF
```

## Nx Cloud для распределённого кэша

```yaml
# .github/workflows/ci.yml
env:
  NX_CLOUD_ACCESS_TOKEN: ${{ secrets.NX_CLOUD_ACCESS_TOKEN }}

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: nrwl/nx-set-shas@v4

      - run: bunx nx affected -t lint test build --parallel=3
```

## Автоматический деплой через webhooks

```typescript
// apps/dashboard/app/api/webhooks/github/route.ts
import { exec } from 'child_process'
import { createHmac } from 'crypto'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  const signature = request.headers.get('x-hub-signature-256')
  const body = await request.text()

  // Проверка подписи
  const hmac = createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
  const digest = 'sha256=' + hmac.update(body).digest('hex')

  if (signature !== digest) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const payload = JSON.parse(body)

  // Только main branch
  if (payload.ref !== 'refs/heads/main') {
    return Response.json({ message: 'Ignored non-main branch' })
  }

  // Запуск деплоя в фоне
  execAsync('cd /var/www/lena && ./deploy-affected.sh')
    .then(() => console.log('Deploy completed'))
    .catch((err) => console.error('Deploy failed:', err))

  return Response.json({ message: 'Deploy triggered' })
}
```

## Staging окружение

```yaml
# .github/workflows/staging.yml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to staging
        env:
          STAGING_HOST: ${{ secrets.STAGING_HOST }}
        run: |
          ssh deploy@$STAGING_HOST << 'EOF'
            cd /var/www/lena-staging
            git pull origin develop
            ./deploy-affected.sh --env staging
          EOF
```

## Preview environments (Vercel-style)

```yaml
# .github/workflows/preview.yml
name: Preview

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Get PR number
        id: pr
        run: echo "number=${{ github.event.pull_request.number }}" >> $GITHUB_OUTPUT

      - name: Build preview
        run: |
          # Сборка Docker образа с тегом PR
          docker build -t app:pr-${{ steps.pr.outputs.number }} .

      - name: Deploy preview
        run: |
          # Деплой на preview-$PR_NUMBER.example.com
          docker compose -f docker-compose.preview.yml up -d

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed: https://preview-${{ steps.pr.outputs.number }}.example.com'
            })
```

## Кэширование в CI

```yaml
jobs:
  build:
    steps:
      # Кэш Bun
      - uses: actions/cache@v4
        with:
          path: ~/.bun/install/cache
          key: bun-${{ runner.os }}-${{ hashFiles('bun.lockb') }}

      # Кэш Nx
      - uses: actions/cache@v4
        with:
          path: .nx/cache
          key: nx-${{ runner.os }}-${{ hashFiles('bun.lockb') }}-${{ github.sha }}
          restore-keys: |
            nx-${{ runner.os }}-${{ hashFiles('bun.lockb') }}-
            nx-${{ runner.os }}-

      # Кэш Next.js
      - uses: actions/cache@v4
        with:
          path: ${{ github.workspace }}/.next/cache
          key: nextjs-${{ runner.os }}-${{ hashFiles('bun.lockb') }}-${{ hashFiles('**/*.ts', '**/*.tsx') }}
          restore-keys: |
            nextjs-${{ runner.os }}-${{ hashFiles('bun.lockb') }}-
```

## Правила CI/CD

- **MUST** проверять lint и types перед merge
- **MUST** использовать `--frozen-lockfile` для reproducible builds
- **SHOULD** использовать Nx affected для оптимизации
- **SHOULD** кэшировать зависимости и артефакты
- **NEVER** хранить секреты в коде — только через secrets
