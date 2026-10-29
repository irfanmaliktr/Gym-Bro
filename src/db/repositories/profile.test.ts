import { describe, expect, it } from 'vitest'
import { useTestDatabase } from '../../test/database'
import {
  DEFAULT_DISPLAY_NAME,
  getProfile,
  hasProfile,
  normaliseDisplayName,
  PROFILE_ID,
  saveProfile,
} from './profile'

describe('normaliseDisplayName (ONBD-002)', () => {
  it('falls back to "Lifter" when empty, missing or whitespace only', () => {
    expect(normaliseDisplayName()).toBe(DEFAULT_DISPLAY_NAME)
    expect(normaliseDisplayName('')).toBe(DEFAULT_DISPLAY_NAME)
    expect(normaliseDisplayName('    ')).toBe(DEFAULT_DISPLAY_NAME)
    expect(normaliseDisplayName(null)).toBe(DEFAULT_DISPLAY_NAME)
  })

  it('trims and collapses the supplied name', () => {
    expect(normaliseDisplayName('  Alex   Junior ')).toBe('Alex Junior')
  })
})

describe('profile repository', () => {
  it('starts with no row at all — Flow A depends on the absence', async () => {
    const database = useTestDatabase()
    expect(await getProfile(database)).toBeNull()
    expect(await hasProfile(database)).toBe(false)
  })

  it('creates the fixed-key row on first save', async () => {
    const database = useTestDatabase()
    const profile = await saveProfile({ displayName: 'Alex' }, database)

    expect(profile).toMatchObject({ id: PROFILE_ID, display_name: 'Alex' })
    expect(profile.created_at).toBe(profile.updated_at)
    expect(await hasProfile(database)).toBe(true)
    expect(await database.user_profile.count()).toBe(1)
  })

  it('stores the default name when the field is left empty', async () => {
    const database = useTestDatabase()
    const profile = await saveProfile({ displayName: '   ' }, database)
    expect(profile.display_name).toBe(DEFAULT_DISPLAY_NAME)
  })

  it('updates the name without creating a second row and preserves created_at', async () => {
    const database = useTestDatabase()
    const created = await saveProfile({ displayName: 'Alex' }, database)
    await database.user_profile.update(PROFILE_ID, { created_at: 1234 })

    const updated = await saveProfile({ displayName: 'Sam' }, database)

    expect(updated.display_name).toBe('Sam')
    expect(updated.created_at).toBe(1234)
    expect(updated.updated_at).toBeGreaterThanOrEqual(created.updated_at)
    expect(await database.user_profile.count()).toBe(1)
  })

  it('keeps an existing starting weight when only the name changes', async () => {
    const database = useTestDatabase()
    await saveProfile({ displayName: 'Alex' }, database)
    await database.user_profile.update(PROFILE_ID, { starting_weight_kg: 78.5 })

    const updated = await saveProfile({ displayName: 'Alex B' }, database)
    expect(updated.starting_weight_kg).toBe(78.5)
  })

  it('keeps the existing name when no name is passed', async () => {
    const database = useTestDatabase()
    await saveProfile({ displayName: 'Alex' }, database)
    const updated = await saveProfile({}, database)
    expect(updated.display_name).toBe('Alex')
  })
})
