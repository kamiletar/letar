import * as fs from 'fs'
import * as path from 'path'
import type { Config } from './config.schema'
import { ConfigSchema } from './config.schema'

/**
 * Configuration loader with validation
 */
export class ConfigLoader {
  private static instance: Config | null = null

  /**
   * Load configuration from file
   * @param configPath Path to configuration file (absolute or relative to app directory)
   * @returns Validated configuration object
   */
  static load(configPath?: string): Config {
    // Return cached instance if available
    if (ConfigLoader.instance) {
      return ConfigLoader.instance
    }

    // Determine config file path
    // For built app: config is in dist/apps/label-printer/config/default.json
    // For dev: use apps/label-printer/config/default.json relative to workspace root
    let defaultConfigPath: string
    let appRootDir: string

    // Try to find config relative to the built app first
    const builtConfigPath = path.join(__dirname, '..', '..', 'config', 'default.json')

    // Fallback to source config in workspace
    const sourceConfigPath = path.join(process.cwd(), 'apps', 'label-printer', 'config', 'default.json')

    if (fs.existsSync(builtConfigPath)) {
      defaultConfigPath = builtConfigPath
      appRootDir = path.join(__dirname, '..', '..')
    } else if (fs.existsSync(sourceConfigPath)) {
      defaultConfigPath = sourceConfigPath
      appRootDir = path.join(process.cwd(), 'apps', 'label-printer')
    } else {
      // Last fallback - try cwd/config
      defaultConfigPath = path.join(process.cwd(), 'config', 'default.json')
      appRootDir = process.cwd()
    }

    const envConfigPath = process.env.LABEL_PRINTER_CONFIG_PATH
    const finalConfigPath = configPath || envConfigPath || defaultConfigPath

    // Check if config file exists
    if (!fs.existsSync(finalConfigPath)) {
      throw new Error(
        `Configuration file not found: ${finalConfigPath}\n`
          + `Please ensure the config file exists or set LABEL_PRINTER_CONFIG_PATH environment variable.`,
      )
    }

    try {
      // Read and parse JSON file
      const configContent = fs.readFileSync(finalConfigPath, 'utf-8')
      const rawConfig = JSON.parse(configContent)

      // Validate configuration using Zod schema
      const validatedConfig = ConfigSchema.parse(rawConfig)

      // Resolve relative paths to absolute (relative to app root directory)
      if (!path.isAbsolute(validatedConfig.label.templatePath)) {
        validatedConfig.label.templatePath = path.resolve(appRootDir, validatedConfig.label.templatePath)
      }
      if (!path.isAbsolute(validatedConfig.database.path)) {
        validatedConfig.database.path = path.resolve(appRootDir, validatedConfig.database.path)
      }

      // Cache the configuration
      ConfigLoader.instance = validatedConfig

      return validatedConfig
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in configuration file: ${finalConfigPath}\n` + `Error: ${error.message}`)
      }

      if (error instanceof Error && error.name === 'ZodError') {
        throw new Error(`Configuration validation failed:\n${error.message}`)
      }

      throw error
    }
  }

  /**
   * Reset cached configuration (useful for testing)
   */
  static reset(): void {
    ConfigLoader.instance = null
  }

  /**
   * Get current configuration instance
   * @throws Error if configuration has not been loaded yet
   */
  static getInstance(): Config {
    if (!ConfigLoader.instance) {
      throw new Error('Configuration not loaded. Call ConfigLoader.load() first.')
    }
    return ConfigLoader.instance
  }
}
