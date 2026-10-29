import type { Unit } from '../lib/units'
import { db as defaultDatabase, type GymbroDatabase } from './database'

/** Supported UI languages (ONBD-004). */
export type Language = 'en' | 'id'

/**
 * Keys used inside the `app_settings` key/value store (§8.2 table 2, §12).
 * Later phases append their own keys here instead of introducing new stores.
 */
export const SETTING_KEYS = {
  language: 'language',
  unit: 'unit',
  theme: 'theme',
  bodyweightEnabled: 'bodyweight_enabled',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

/** Defaults mandated by the PRD: `en` (ONBD-004) and `kg` (ONBD-003). */
export const DEFAULT_LANGUAGE: Language = 'en'
export const DEFAULT_UNIT: Unit = 'kg'
export const DEFAULT_THEME = 'dark'
export const DEFAULT_BODYWEIGHT_ENABLED = true

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'id'
}

export function isUnit(value: unknown): value is Unit {
  return value === 'kg' || value === 'lbs'
}

/** Reads a setting, falling back when the row is absent (no row is ever pre-created). */
export async function getSetting<T>(
  key: string,
  fallback: T,
  database: GymbroDatabase = defaultDatabase,
): Promise<T> {
  const row = await database.app_settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

/** Writes a setting, creating or replacing the single row for `key`. */
export async function setSetting<T>(
  key: string,
  value: T,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  await database.app_settings.put({ key, value })
}

/** Active language (I18N: `app_settings` where `key = 'language'`). */
export async function getLanguage(database: GymbroDatabase = defaultDatabase): Promise<Language> {
  const stored = await getSetting<unknown>(SETTING_KEYS.language, DEFAULT_LANGUAGE, database)
  return isLanguage(stored) ? stored : DEFAULT_LANGUAGE
}

export async function setLanguage(
  language: Language,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  await setSetting(SETTING_KEYS.language, language, database)
}

/** Preferred weight unit for display (ONBD-003; storage is always kg). */
export async function getUnit(database: GymbroDatabase = defaultDatabase): Promise<Unit> {
  const stored = await getSetting<unknown>(SETTING_KEYS.unit, DEFAULT_UNIT, database)
  return isUnit(stored) ? stored : DEFAULT_UNIT
}

export async function setUnit(
  unit: Unit,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  await setSetting(SETTING_KEYS.unit, unit, database)
}

/** Body Weight Tracker enabled/disabled preference (default enabled). */
export async function getBodyweightEnabled(
  database: GymbroDatabase = defaultDatabase,
): Promise<boolean> {
  const stored = await getSetting<unknown>(SETTING_KEYS.bodyweightEnabled, DEFAULT_BODYWEIGHT_ENABLED, database)
  return isBoolean(stored) ? stored : DEFAULT_BODYWEIGHT_ENABLED
}

export async function setBodyweightEnabled(
  enabled: boolean,
  database: GymbroDatabase = defaultDatabase,
): Promise<void> {
  await setSetting(SETTING_KEYS.bodyweightEnabled, enabled, database)
}
