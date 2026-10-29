import type { Unit } from '../lib/units'
import { db as defaultDatabase, type GymbroDatabase } from './database'
import { seedExerciseCatalog } from './seed'
import {
  DEFAULT_LANGUAGE,
  getLanguage,
  getUnit,
  isLanguage,
  SETTING_KEYS,
  setSetting,
  type Language,
} from './settings'

/**
 * Phase 0 kept the language preference in `localStorage` while there was no
 * database. §12 now defines `app_settings` as the storage location, so the old
 * key is migrated once on start-up and then retired.
 */
export const LEGACY_LANGUAGE_KEY = 'gymbro.language'

/** The subset of the Web Storage API the migration needs (injectable for tests). */
export interface KeyValueStorage {
  getItem(key: string): string | null
  removeItem(key: string): void
}

/** Returns `localStorage` when available (browser + permissions), else `null`. */
export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // Accessing localStorage throws in some privacy/partitioned contexts.
    return null
  }
}

export interface BootstrapResult {
  /** Language resolved from `app_settings` (or migrated from Phase 0). */
  language: Language
  /** Preferred display unit resolved from `app_settings`. */
  unit: Unit
  /** Rows actually inserted by this run (0 on every start after the first). */
  seededExercises: number
  /** Total rows in the built-in + custom exercise catalog. */
  exerciseCount: number
}

/**
 * Moves a Phase 0 `localStorage` language choice into `app_settings`.
 * One-shot: the legacy key is removed whether or not it was usable, and an
 * already-stored language always wins.
 */
export async function migrateLegacyLanguage(
  database: GymbroDatabase = defaultDatabase,
  storage: KeyValueStorage | null = browserStorage(),
): Promise<boolean> {
  if (!storage) return false

  const legacy = storage.getItem(LEGACY_LANGUAGE_KEY)
  if (legacy === null) return false

  storage.removeItem(LEGACY_LANGUAGE_KEY)
  if (!isLanguage(legacy)) return false

  const existing = await database.app_settings.get(SETTING_KEYS.language)
  if (existing !== undefined) return false

  await setSetting(SETTING_KEYS.language, legacy, database)
  return true
}

/**
 * Prepares local storage for the UI: opens the database, seeds the built-in
 * exercise catalog (EXER-001) and resolves the persisted preferences.
 *
 * Runs before the first React render so the app never flashes the wrong
 * language, and is safe to call on every start.
 */
export async function bootstrapDatabase(
  database: GymbroDatabase = defaultDatabase,
  storage: KeyValueStorage | null = browserStorage(),
): Promise<BootstrapResult> {
  await database.open()

  const seededExercises = await seedExerciseCatalog(database)
  await migrateLegacyLanguage(database, storage)

  const [language, unit, exerciseCount] = await Promise.all([
    getLanguage(database),
    getUnit(database),
    database.exercise_catalog.count(),
  ])

  return { language, unit, seededExercises, exerciseCount }
}

/** Result used when storage is unavailable, so the shell can still render. */
export const FALLBACK_BOOTSTRAP: BootstrapResult = {
  language: DEFAULT_LANGUAGE,
  unit: 'kg',
  seededExercises: 0,
  exerciseCount: 0,
}
