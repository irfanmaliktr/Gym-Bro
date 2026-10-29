import { describe, expect, it } from 'vitest'
import { useTestDatabase } from '../test/database'
import { bootstrapDatabase, LEGACY_LANGUAGE_KEY, type KeyValueStorage } from './bootstrap'
import { SEEDED_EXERCISES } from './exercises.seed'
import { getLanguage, setLanguage, setUnit } from './settings'

/** Minimal in-memory stand-in for `localStorage`. */
function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  has: (key: string) => boolean
} {
  const entries = new Map(Object.entries(initial))
  return {
    getItem: (key) => entries.get(key) ?? null,
    removeItem: (key) => {
      entries.delete(key)
    },
    has: (key) => entries.has(key),
  }
}

describe('bootstrapDatabase', () => {
  it('seeds the catalog and resolves the PRD defaults on first run', async () => {
    const database = useTestDatabase()

    const result = await bootstrapDatabase(database, null)

    expect(result).toEqual({
      language: 'en',
      unit: 'kg',
      seededExercises: SEEDED_EXERCISES.length,
      exerciseCount: SEEDED_EXERCISES.length,
    })
  })

  it('is safe to call on every start', async () => {
    const database = useTestDatabase()

    await bootstrapDatabase(database, null)
    const second = await bootstrapDatabase(database, null)

    expect(second.seededExercises).toBe(0)
    expect(second.exerciseCount).toBe(SEEDED_EXERCISES.length)
  })

  it('resolves preferences persisted in app_settings', async () => {
    const database = useTestDatabase()
    await setLanguage('id', database)
    await setUnit('lbs', database)

    const result = await bootstrapDatabase(database, null)

    expect(result.language).toBe('id')
    expect(result.unit).toBe('lbs')
    expect(await getLanguage(database)).toBe('id')
  })
})

describe('legacy localStorage language migration', () => {
  it('moves a Phase 0 choice into app_settings and retires the key', async () => {
    const database = useTestDatabase()
    const storage = memoryStorage({ [LEGACY_LANGUAGE_KEY]: 'id' })

    const result = await bootstrapDatabase(database, storage)

    expect(result.language).toBe('id')
    expect(storage.has(LEGACY_LANGUAGE_KEY)).toBe(false)
  })

  it('drops an unusable legacy value without touching the default', async () => {
    const database = useTestDatabase()
    const storage = memoryStorage({ [LEGACY_LANGUAGE_KEY]: 'klingon' })

    const result = await bootstrapDatabase(database, storage)

    expect(result.language).toBe('en')
    expect(storage.has(LEGACY_LANGUAGE_KEY)).toBe(false)
  })

  it('never overwrites a language already stored in the database', async () => {
    const database = useTestDatabase()
    await setLanguage('en', database)
    const storage = memoryStorage({ [LEGACY_LANGUAGE_KEY]: 'id' })

    const result = await bootstrapDatabase(database, storage)

    expect(result.language).toBe('en')
    expect(storage.has(LEGACY_LANGUAGE_KEY)).toBe(false)
  })

  it('works without web storage (tests, SSR, blocked storage)', async () => {
    const database = useTestDatabase()

    const result = await bootstrapDatabase(database, null)

    expect(result.language).toBe('en')
  })
})
