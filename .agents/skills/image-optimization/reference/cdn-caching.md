# CDN Caching

## Cache-Control заголовки

```typescript
// Статические изображения (неизменяемые)
'Cache-Control': 'public, max-age=31536000, immutable'

// Динамические изображения (могут меняться)
'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800'
```

## Стратегия по типу контента

| Тип     | max-age | stale-while-revalidate |
| ------- | ------- | ---------------------- |
| Товары  | 1 год   | — (immutable)          |
| Аватары | 1 час   | 1 день                 |
| Баннеры | 1 день  | 7 дней                 |
| UGC     | 1 час   | 1 день                 |

## ETag для валидации

```typescript
export async function GET(request: NextRequest) {
  const image = await db.image.findUnique({ where: { id } })
  const etag = `"${image.id}-${image.updatedAt.getTime()}"`

  // Проверка If-None-Match
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304 })
  }

  const file = await readFile(filePath)
  return new NextResponse(file, {
    headers: {
      ETag: etag,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
```

## Vary для content negotiation

```typescript
// Важно при WebP fallback
headers: {
  'Vary': 'Accept',
  'Cache-Control': 'public, max-age=31536000',
}
```

## Purge cache при обновлении

```typescript
// При обновлении изображения
async function updateImage(id: string, newFile: Buffer) {
  // Генерируем новый ID для cache bust
  const newId = randomUUID()

  await db.image.update({
    where: { id },
    data: { id: newId, updatedAt: new Date() },
  })

  // URL изменится → кэш инвалидируется автоматически
  return newId
}
```

## CDN конфигурация (Nginx)

```nginx
# nginx.conf
location /api/images/ {
    proxy_pass http://app:3000;
    proxy_cache images_cache;
    proxy_cache_valid 200 1y;
    proxy_cache_key $uri$is_args$args;
    add_header X-Cache-Status $upstream_cache_status;
}

proxy_cache_path /var/cache/nginx/images
    levels=1:2
    keys_zone=images_cache:10m
    max_size=10g
    inactive=1y
    use_temp_path=off;
```

## Cloudflare Page Rules

```
URL: example.com/api/images/*
Cache Level: Cache Everything
Edge Cache TTL: 1 month
Browser Cache TTL: 1 year
```

## Мониторинг cache hit ratio

```typescript
// Добавить заголовок для отладки
headers: {
  'X-Cache-Generated': new Date().toISOString(),
}
```

При высоком cache hit ratio (>90%) — кэширование работает эффективно.
