/**
 * Unit + number formatting helpers (ONBD-003, I18N-003).
 *
 * Storage contract: every weight in the database is kilograms
 * (`weight_kg`, `starting_weight_kg`, `target_weight_kg`). Pounds only exist as
 * a projection for display and input, so all conversions funnel through
 * `toDisplayWeight` / `toStorageKg` and never leak into persisted values.
 */

/** Display/input unit preference (ONBD-003). */
export type Unit = 'kg' | 'lbs'

/** International avoirdupois pound — exact by definition. */
export const KG_PER_LB = 0.45359237
export const LB_PER_KG = 1 / KG_PER_LB

/** Storage precision: 0.001 kg = 1 g, far below any plate increment. */
export const STORAGE_DECIMALS_KG = 3

export function kgToLb(kilograms: number): number {
  return kilograms * LB_PER_KG
}

export function lbToKg(pounds: number): number {
  return pounds * KG_PER_LB
}

/** kg (storage) → the number the user should see in their preferred unit. */
export function toDisplayWeight(kilograms: number, unit: Unit): number {
  return unit === 'kg' ? kilograms : kgToLb(kilograms)
}

/** A user-entered number in their preferred unit → kg for storage. */
export function toStorageKg(value: number, unit: Unit): number {
  const kilograms = unit === 'kg' ? value : lbToKg(value)
  return roundTo(kilograms, STORAGE_DECIMALS_KG)
}

/** Rounds half-up to `decimals` places and normalises `-0` to `0`. */
export function roundTo(value: number, decimals = 0): number {
  if (!Number.isFinite(value)) return value
  const rounded = Number(value.toFixed(decimals))
  return Object.is(rounded, -0) ? 0 : rounded
}

/**
 * Snaps a value to the nearest multiple of `step` (e.g. 2.5 kg plates).
 * Returns the value untouched for non-positive/invalid steps.
 */
export function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value
  return roundTo(Math.round(value / step) * step, 6)
}

/** Locale-aware number formatting (grouping separators, decimal comma for `id-ID`). */
export function formatNumber(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions = {},
): string {
  return new Intl.NumberFormat(locale, options).format(value)
}

export interface FormatWeightOptions {
  /** Maximum fraction digits. Defaults to 1 (e.g. `102.5 kg`, `225 lbs`). */
  decimals?: number
  /** Localized unit suffix from the dictionary; omitted when not provided. */
  unitLabel?: string
}

/**
 * Formats a stored kilogram value for display in the active unit + locale.
 * `formatWeight(102.5, 'kg', 'en-US')` → `"102.5"`, `('id-ID')` → `"102,5"`.
 */
export function formatWeight(
  kilograms: number,
  unit: Unit,
  locale: string,
  options: FormatWeightOptions = {},
): string {
  const decimals = options.decimals ?? 1
  const text = formatNumber(toDisplayWeight(kilograms, unit), locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
  return options.unitLabel ? `${text} ${options.unitLabel}` : text
}

/**
 * Formats a volume (`weight × reps`, stored in kg·reps) for display.
 * Whole numbers with grouping: `"12,450"` (en-US) / `"12.450"` (id-ID).
 */
export function formatVolume(
  kilograms: number,
  unit: Unit,
  locale: string,
  options: FormatWeightOptions = {},
): string {
  return formatWeight(kilograms, unit, locale, { decimals: 0, ...options })
}

/**
 * Parses a decimal written with either separator convention.
 * Accepts `"102.5"`, `"102,5"`, `"1,234.5"` and `"1.234,5"`; returns `null`
 * for empty or non-numeric input so callers can keep the last valid value.
 */
export function parseDecimal(input: string): number | null {
  const cleaned = input.trim().replace(/[\s_]/g, '')
  if (cleaned === '') return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let normalised = cleaned
  if (lastComma > -1 && lastDot > -1) {
    // Both separators present: the right-most one is the decimal separator.
    normalised =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.')
        : cleaned.replace(/,/g, '')
  } else if (lastComma > -1) {
    normalised = cleaned.replace(',', '.')
  }

  if (!/^-?\d*\.?\d*$/.test(normalised) || normalised === '.' || normalised === '-' || normalised === '') {
    return null
  }

  const value = Number(normalised)
  return Number.isFinite(value) ? value : null
}

/**
 * Parses a weight input in the user's unit and returns kilograms ready for
 * storage. `parseWeightInput('225', 'lbs')` → `102.058`.
 */
export function parseWeightInput(input: string, unit: Unit): number | null {
  const value = parseDecimal(input)
  if (value === null) return null
  return toStorageKg(value, unit)
}
