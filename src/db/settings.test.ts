import { describe, expect, it } from 'vitest'
import { useTestDatabase } from '../test/database'
import {
  DEFAULT_LANGUAGE,
  DEFAULT_UNIT,
  getLanguage,
  getSetting,
  getUnit,
  isLanguage,
  isUnit,
  SETTING_KEYS,
  setLanguage,
  setSetting,
  setUnit,
} from './settings'

describe('app_settings key/value store (§8.2, §12)', () => {
  it('returns the fallback when no row exists', async () => {
    const database = useTestDatabase()
    expect(await getSetting(SETTING_KEYS.language, 'fallback', database)).toBe('fallback')
    expect(await database.app_settings.count()).toBe(0)
  })

  it('round-trips any JSON-serialisable value', async () => {
    const database = useTestDatabase()

    await setSetting('unit', 'lbs', database)
    await setSetting('rest_seconds', 90, database)
    await setSetting('object', { enabled: true }, database)

    expect(await getSetting('unit', DEFAULT_UNIT, database)).toBe('lbs')
    expect(await getSetting('rest_seconds', 0, database)).toBe(90)
    expect(await getSetting('object', {}, database)).toEqual({ enabled: true })
  })

  it('keeps exactly one row per key when a setting is changed', async () => {
    const database = useTestDatabase()

    await setSetting('unit', 'kg', database)
    await setSetting('unit', 'lbs', database)
    await setSetting('unit', 'kg', database)

    expect(await database.app_settings.count()).toBe(1)
    expect(await getSetting('unit', DEFAULT_UNIT, database)).toBe('kg')
  })
})

describe('language preference (I18N, ONBD-004)', () => {
  it('defaults to English', async () => {
    const database = useTestDatabase()
    expect(await getLanguage(database)).toBe('en')
    expect(DEFAULT_LANGUAGE).toBe('en')
  })

  it('persists and reads back the selected language', async () => {
    const database = useTestDatabase()
    await setLanguage('id', database)

    expect(await getLanguage(database)).toBe('id')
    expect(await database.app_settings.get(SETTING_KEYS.language)).toEqual({
      key: 'language',
      value: 'id',
    })
  })

  it('ignores a corrupted stored value instead of breaking the UI', async () => {
    const database = useTestDatabase()
    await setSetting(SETTING_KEYS.language, 'de', database)

    expect(await getLanguage(database)).toBe('en')
    expect(isLanguage('de')).toBe(false)
    expect(isLanguage('id')).toBe(true)
  })
})

describe('unit preference (ONBD-003)', () => {
  it('defaults to kilograms', async () => {
    const database = useTestDatabase()
    expect(await getUnit(database)).toBe('kg')
    expect(DEFAULT_UNIT).toBe('kg')
  })

  it('persists pounds and rejects unknown units', async () => {
    const database = useTestDatabase()
    await setUnit('lbs', database)
    expect(await getUnit(database)).toBe('lbs')

    await setSetting(SETTING_KEYS.unit, 'stones', database)
    expect(await getUnit(database)).toBe('kg')
    expect(isUnit('stones')).toBe(false)
  })
})
