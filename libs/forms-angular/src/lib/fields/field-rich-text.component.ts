import {
  type AfterViewInit,
  Component,
  type ComponentRef,
  Input,
  type OnChanges,
  type OnDestroy,
  signal,
  ViewChild,
  ViewContainerRef,
} from '@angular/core'
import type { RichTextButton } from '../core/rich-text-actions'
import type { FieldRichTextImplComponent } from './field-rich-text-impl.component'

export type { RichTextButton } from '../core/rich-text-actions'

/**
 * FieldRichText (Angular) — тонкая обёртка, лениво подгружающая тяжёлую реализацию на Tiptap
 * (`field-rich-text-impl.component.ts`). `@tiptap/*` — тяжёлый peer-dep, нужный только этому
 * полю; потребители остальных text-полей (String, Password, Textarea...) не обязаны его
 * резолвить — та же цель, что `createLazyField` в `@letar/forms-vue`.
 *
 * ## Архитектурное решение: явный `import()` + `ViewContainerRef.createComponent`, не `@defer`
 *
 * Angular 17+ даёт встроенный `@defer` специально под ленивую загрузку блока шаблона. Он не
 * выбран здесь по одной причине: `@defer` — это трансформация **шаблонного компилятора**
 * (`@angular/compiler-cli`), которая на этапе сборки статически находит компонент, использованный
 * внутри блока, и выносит его импорт в отдельный чанк. Эта трансформация принадлежит сборке
 * **потребителя** библиотеки (его Angular CLI/esbuild-конфигурации), а не самой библиотеке —
 * `forms-angular` раздаётся как сырой TypeScript-исходник через `customConditions:
 * ["@letar/source"]` (см. `libs.md`), и какой инструмент в итоге скомпилирует этот файл, решает
 * потребитель. Полагаться на то, что каждый потребитель включит и правильно настроит
 * `@defer`-трансформ — не то же самое, что код-сплиттинг, который работает сам по себе под любым
 * бандлером. Явный `import()` — рантайм-примитив ES-модулей, а не compile-time-трансформация;
 * это переносимо и совпадает по духу с `createLazyField` (`@letar/forms-vue`, `defineAsyncComponent`)
 * и `React.lazy`/`Form.Captcha` в React-скине — тот же паттерн лени, третий раз в этой библиотеке
 * форм, каждый раз на примитиве своего фреймворка.
 *
 * `ViewContainerRef.createComponent()` — начиная с Ivy не требует `NgModule`/
 * `ComponentFactoryResolver` для создания standalone-компонента динамически. `ComponentRef.setInput()`
 * — единственный API, который одновременно присваивает `@Input()`-декорированному полю значение
 * И вызывает `ngOnChanges()` на созданном экземпляре (обычное `ref.instance.x = y` этого не
 * делает) — на `ngOnChanges` держится реактивность `FieldBase.meta` (`inputsVersion`, см.
 * `field-base.ts`), поэтому без `setInput()` подгруженное поле не подхватило бы схему/метаданные.
 */
@Component({
  selector: 'letar-field-rich-text',
  standalone: true,
  template: `
    <ng-container #anchor></ng-container>
    @if (!loaded()) {
      <div class="letar-field__lazy-skeleton" [style.minHeight]="cssMinHeight()" aria-hidden="true"></div>
    }
  `,
})
export class FieldRichTextComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true })
  name!: string
  @Input()
  label?: string
  @Input()
  placeholder?: string
  @Input()
  minHeight: string | number = '150px'
  @Input()
  maxHeight?: string | number
  @Input()
  showToolbar = true
  @Input()
  toolbarButtons?: RichTextButton[]
  @Input()
  outputFormat: 'html' | 'json' = 'html'

  @ViewChild('anchor', { read: ViewContainerRef, static: true })
  private readonly anchor!: ViewContainerRef

  protected readonly loaded = signal(false)
  private implRef?: ComponentRef<FieldRichTextImplComponent>

  async ngAfterViewInit(): Promise<void> {
    const { FieldRichTextImplComponent } = await import('./field-rich-text-impl.component')
    const ref = this.anchor.createComponent(FieldRichTextImplComponent)
    this.implRef = ref
    this.applyInputs(ref)
    this.loaded.set(true)
  }

  ngOnChanges(): void {
    if (this.implRef) {
      this.applyInputs(this.implRef)
    }
  }

  ngOnDestroy(): void {
    this.implRef?.destroy()
  }

  private applyInputs(ref: ComponentRef<FieldRichTextImplComponent>): void {
    ref.setInput('name', this.name)
    ref.setInput('label', this.label)
    ref.setInput('placeholder', this.placeholder)
    ref.setInput('minHeight', this.minHeight)
    ref.setInput('maxHeight', this.maxHeight)
    ref.setInput('showToolbar', this.showToolbar)
    if (this.toolbarButtons) {
      ref.setInput('toolbarButtons', this.toolbarButtons)
    }
    ref.setInput('outputFormat', this.outputFormat)
  }

  protected cssMinHeight(): string {
    return typeof this.minHeight === 'number' ? `${this.minHeight}px` : this.minHeight
  }
}
