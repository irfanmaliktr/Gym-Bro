import { db as defaultDatabase, type GymbroDatabase } from '../database'
import type { UserProfile } from '../types'

/**
 * Profile persistence (ONBD-001…005).
 *
 * The row's *absence* is the "has this user been through onboarding?" signal
 * (PRD §7 Flow A), so nothing here pre-creates it: it is written only when the
 * user finishes or skips the welcome screen.
 */
export const PROFILE_ID = 'default_user'

/** ONBD-002 fallback when the user leaves the name field empty. */
export const DEFAULT_DISPLAY_NAME = 'Lifter'

const MAX_DISPLAY_NAME_LENGTH = 40

export async function getProfile(database: GymbroDatabase = defaultDatabase): Promise<UserProfile | null> {
  return (await database.user_profile.get(PROFILE_ID)) ?? null
}

export async function hasProfile(database: GymbroDatabase = defaultDatabase): Promise<boolean> {
  return (await database.user_profile.get(PROFILE_ID)) !== undefined
}

/** `undefined`/blank → `"Lifter"` (ONBD-002); also caps runaway input length. */
export function normaliseDisplayName(name?: string | null): string {
  const trimmed = (name ?? '').trim().replace(/\s+/g, ' ')
  if (trimmed === '') return DEFAULT_DISPLAY_NAME
  return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH)
}

/**
 * Creates the profile on first completion, or updates the display name.
 * `created_at` is preserved across updates; `updated_at` always bumps.
 */
export async function saveProfile(
  input: { displayName?: string } = {},
  database: GymbroDatabase = defaultDatabase,
): Promise<UserProfile> {
  const now = Date.now()
  const existing = await getProfile(database)

  const profile: UserProfile = {
    id: PROFILE_ID,
    display_name: normaliseDisplayName(input.displayName ?? existing?.display_name),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  }
  if (existing?.starting_weight_kg !== undefined) {
    profile.starting_weight_kg = existing.starting_weight_kg
  }

  await database.user_profile.put(profile)
  return profile
}
