/**
 * Animatrona TV — Android TV приложение для просмотра аниме
 *
 * @format
 */

import { AppRegistry } from 'react-native'
import App from './App'

// Версия JS bundle для отладки кэширования
const JS_VERSION = '0.2.1'
console.log(`[AnimatronaTV] JS Bundle version: ${JS_VERSION}`)

AppRegistry.registerComponent('AnimatronaTV', () => App)
