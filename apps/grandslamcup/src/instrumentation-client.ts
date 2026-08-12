// Ложное срабатывание: та же пара static(/client)+dynamic(/server) подпутей `@letar/glitchtip`,
// что и в studio/archetest (там проходит чисто), но здесь `@nx/enforce-module-boundaries` не
// резолвит secondary entry point для этого конкретного консьюмера и считает импорт статическим
// импортом «lazy-loaded» библиотеки. Причина не установлена (граф зависимостей и tsconfig-paths
// идентичны рабочим случаям) — см. PLAN-INFRA.md §70 п.7, не блокировать на этом дальнейший тираж.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { initClient } from '@letar/glitchtip/client'

initClient({
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,
  environment: process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT ?? 'development',
})
