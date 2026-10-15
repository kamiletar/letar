# Next.js: Node-импорт внутри положительной ветки NEXT_RUNTIME

Проверено на Next.js 16.4.1, webpack dev и sharp 0.35.5.

## Симптом и причина

`next dev --webpack` падает при сборке instrumentation с `Can't resolve 'child_process'`
из `detect-libc`, если Node-зависимость (например sharp) импортируется после раннего выхода:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') { return }
  const { start } = await import('./node-background-job')
  start()
}
```

Ранний выход защищает выполнение, но в проверенной dev-сборке не исключает dependency из
edge-графа. Production webpack build может проходить, поэтому его недостаточно для проверки.

## Исправление

Импорт и вызов должны целиком находиться внутри положительной проверки среды, как в
документации установленного Next.js (`dist/docs/01-app/02-guides/instrumentation.md`):

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { start } = await import('./node-background-job')
    start()
  }
}
```

Не отключать фоновую работу и не добавлять webpack fallback на Node-модули: это скрыло бы
ошибочную границу сред. После правки перезапустить dev-сервер, чтобы пересобрать instrumentation.

## Проверка

- `next dev --webpack`: запуск сервера и загрузка настоящей страницы без ошибки импорта.
- `.next/dev/server/edge-instrumentation.js`: нет Node-задачи и её зависимостей.
- Node register вызывает фоновую работу; повторная регистрация не размножает таймеры.
- Production webpack build с `NODE_ENV=production` и обычный Turbopack dev.

На Linux отдельно учитывать доступность нативного sharp: эта правка меняет только границу
импорта; успешная Windows-сборка не проверяет Linux-бинарники.
