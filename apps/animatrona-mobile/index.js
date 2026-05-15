/**
 * @format
 */

import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'

// Версия JS bundle для отладки кэша
const JS_VERSION = '0.8.5-ux-audit'
console.log(`[AnimatronaMobile] JS Bundle version: ${JS_VERSION}`)

AppRegistry.registerComponent(appName, () => App)
