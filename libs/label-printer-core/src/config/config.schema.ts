import { z } from 'zod'

/**
 * Zod schema for application configuration
 */

// Scanner configuration
export const ScannerConfigSchema = z.object({
  type: z.enum(['usb-keyboard', 'serial']).default('usb-keyboard'),
  prefix: z.string().default(''),
  suffix: z.string().default('\n'),
  timeout: z.number().int().positive().default(5000),
  minLength: z.number().int().positive().default(30),
})

// Printer connection configuration
export const PrinterConnectionSchema = z.object({
  type: z.enum(['usb', 'serial', 'network', 'windows']).default('windows'),
  path: z.string().default('/dev/usb/lp0'),
  baudRate: z.number().int().positive().default(9600),
})

// Printer settings configuration
export const PrinterSettingsSchema = z.object({
  speed: z.number().int().min(1).max(14).default(4),
  density: z.number().int().min(0).max(15).default(8),
  width: z.number().positive().default(58),
  height: z.number().positive().default(39),
  dpi: z.number().int().positive().default(300),
  gap: z.number().nonnegative().default(2),
  orientation: z.number().int().min(0).max(3).default(0),
  copies: z.number().int().min(1).max(1000).default(1),
})

// Printer configuration
export const PrinterConfigSchema = z.object({
  name: z.string().default('TSC TE300'),
  mode: z.enum(['mock', 'real']).default('mock'),
  connection: PrinterConnectionSchema,
  settings: PrinterSettingsSchema,
})

// DataMatrix element configuration
export const DataMatrixConfigSchema = z.object({
  enabled: z.boolean().default(true),
  x: z.number().int().nonnegative().default(50),
  y: z.number().int().nonnegative().default(50),
  size: z.number().int().positive().default(160),
  moduleSize: z.number().int().positive().default(4),
  eclevel: z.enum(['L', 'M', 'Q', 'H']).default('M'),
})

// GTIN barcode element configuration
export const GTINBarcodeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  type: z.enum(['ean13', 'ean14', 'itf14']).default('ean13'),
  x: z.number().int().nonnegative().default(250),
  y: z.number().int().nonnegative().default(300),
  width: z.number().int().positive().default(400),
  height: z.number().int().positive().default(100),
  includeText: z.boolean().default(true),
  fontSize: z.number().int().positive().default(24),
  textPosition: z.enum(['top', 'bottom']).default('bottom'),
})

// Label elements configuration
export const LabelElementsConfigSchema = z.object({
  datamatrix: DataMatrixConfigSchema,
  gtin: GTINBarcodeConfigSchema,
})

// Label configuration
export const LabelConfigSchema = z.object({
  templatePath: z.string().default('./templates/label-template.png'),
  width: z.number().int().positive().default(685),
  height: z.number().int().positive().default(461),
  dpi: z.number().int().positive().default(300),
  elements: LabelElementsConfigSchema,
})

// Database configuration
export const DatabaseConfigSchema = z.object({
  path: z.string().default('./data/codes.db'),
})

// Logging configuration
export const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  console: z.boolean().default(true),
  file: z.boolean().default(true),
  maxFiles: z.number().int().positive().default(10),
  maxSize: z.string().default('10m'),
})

// Behavior configuration
export const BehaviorConfigSchema = z.object({
  allowDuplicates: z.boolean().default(false),
  autoReconnectPrinter: z.boolean().default(true),
  retryAttempts: z.number().int().nonnegative().default(3),
  retryDelay: z.number().int().positive().default(1000),
})

// Main configuration schema
export const ConfigSchema = z.object({
  scanner: ScannerConfigSchema,
  printer: PrinterConfigSchema,
  label: LabelConfigSchema,
  database: DatabaseConfigSchema,
  logging: LoggingConfigSchema,
  behavior: BehaviorConfigSchema,
})

// Infer TypeScript type from schema
export type Config = z.infer<typeof ConfigSchema>
export type ScannerConfig = z.infer<typeof ScannerConfigSchema>
export type PrinterConfig = z.infer<typeof PrinterConfigSchema>
export type LabelConfig = z.infer<typeof LabelConfigSchema>
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>
export type LoggingConfig = z.infer<typeof LoggingConfigSchema>
export type BehaviorConfig = z.infer<typeof BehaviorConfigSchema>
