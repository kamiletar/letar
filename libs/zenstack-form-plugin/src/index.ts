/**
 * @letar/zenstack-form-plugin
 *
 * ZenStack plugin for generating Zod v4 schemas with UI metadata from schema.zmodel.
 *
 * @example Configuration in schema.zmodel
 * ```zmodel
 * plugin formSchema {
 *   provider = '@letar/zenstack-form-plugin'
 *   output = './src/generated/form-schemas'
 * }
 * ```
 *
 * @example Enum with labels
 * ```zmodel
 * enum RecipeType {
 *   /// Sweet
 *   SWEET
 *   /// Salty
 *   SALTY
 * }
 * ```
 *
 * @example Model with @form.* directives
 * ```zmodel
 * model Product {
 *   /// @form.title("Product name")
 *   /// @form.placeholder("Enter name")
 *   name  String
 *
 *   /// @form.title("Price")
 *   /// @form.fieldType("currency")
 *   /// @form.props({ currency: "USD" })
 *   price Decimal
 * }
 * ```
 */

import type { CliGeneratorContext, CliPlugin } from '@zenstackhq/sdk'
import { generate } from './generator.js'

/**
 * ZenStack CLI plugin for generating form schemas.
 */
const plugin: CliPlugin = {
  name: 'FormSchema',
  statusText: 'Generating Zod form schemas with UI metadata',

  async generate(context: CliGeneratorContext): Promise<void> {
    await generate(context)
  },
}

export default plugin

// Re-export types for convenience
export type {
  EnumInfo,
  EnumValueInfo,
  FormFieldMeta,
  ModelFieldInfo,
  ModelInfo,
  ValidationTranslations,
} from './types.js'
