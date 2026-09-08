/**
 * @format
 */

import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'

// Версия JS bundle для отладки кэша — печатается всегда, см. CLAUDE.md
// «⚠️ ОБЯЗАТЕЛЬНО: Версионирование в логах»
const JS_VERSION = '0.8.5-ux-audit'
// eslint-disable-next-line no-console -- версионный лог обязателен и вне __DEV__, см. CLAUDE.md
console.log(`[AnimatronaMobile] JS Bundle version: ${JS_VERSION}`)

AppRegistry.registerComponent(appName, () => App)
