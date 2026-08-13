import '@angular/compiler'
import { getTestBed } from '@angular/core/testing'
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing'

// Побочный импорт `@angular/compiler` выше включает JIT-компиляцию декораторов
// (`@Component`, `@Injectable`) — без него `TestBed.createComponent` падает с
// "Component ... is not resolved" (Angular по умолчанию ждёт AOT-скомпилированный код).
// `initTestEnvironment` — ровно то, что делает `@angular/platform-browser-dynamic/testing` под
// Karma/Jest, но вызвано вручную из vitest setup-файла, без Angular CLI/Karma-раннера.
getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting())
