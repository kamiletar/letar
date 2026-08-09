# OAuth-провайдеры — заметки по настройке

[← Назад к README](../README.md)

## VK OAuth конфигурация

VK OAuth требует HTTPS даже для локальной разработки. Используйте ngrok:

```bash
ngrok http 3000
# Redirect URI: https://xxx.ngrok.io/api/auth/callback/vk
```

```typescript
socialProviders: {
  ...(process.env.AUTH_VK_ID && process.env.AUTH_VK_SECRET && {
    vk: {
      clientId: process.env.AUTH_VK_ID,
      clientSecret: process.env.AUTH_VK_SECRET,
      getUserInfo: async (tokens) => {
        const userId = (tokens.raw as { user_id?: number })?.user_id
        const response = await fetch(
          `https://api.vk.com/method/users.get?user_ids=${userId}&fields=photo_200&access_token=${tokens.accessToken}&v=5.131`
        )
        const data = await response.json()
        const user = data.response?.[0]
        if (!user) throw new Error('VK user not found')
        const email = (tokens.raw as { email?: string })?.email
        return {
          user: { id: String(user.id), name: `${user.first_name} ${user.last_name}`.trim(),
            email: email || `${user.id}@vk.com`, image: user.photo_200, emailVerified: !!email },
          data: user,
        }
      },
    },
  }),
},
```

[← Назад к README](../README.md)
