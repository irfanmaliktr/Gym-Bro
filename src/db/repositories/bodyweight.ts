import { newId } from '../../lib/id'
import { db as defaultDatabase, type GymbroDatabase } from '../database'
import type { BodyweightLog } from '../types'

export async function listBodyweightLogs(database: GymbroDatabase = defaultDatabase): Promise<BodyweightLog[]> {
  const logs = await database.bodyweight_logs.toArray()
  return logs.sort((a, b) => a.timestamp - b.timestamp)
}

export async function addBodyweightLog(
  input: { weightKg: number; timestamp: number; notes?: string },
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  const id = newId()
  const log: BodyweightLog = {
    id,
    weight_kg: input.weightKg,
    timestamp: input.timestamp,
    notes: input.notes,
  }
  await database.bodyweight_logs.put(log)
  return id
}

export async function upsertBodyweightLog(
  input: { id?: string; weightKg: number; timestamp: number; notes?: string },
  database: GymbroDatabase = defaultDatabase,
): Promise<string> {
  if (input.id) {
    const existing = await database.bodyweight_logs.get(input.id)
    if (existing) {
      const next: BodyweightLog = { ...existing, weight_kg: input.weightKg, timestamp: input.timestamp, notes: input.notes }
      await database.bodyweight_logs.put(next)
      return input.id
    }
  }
  // If there's already a log for this exact timestamp date? The requirement says "Define how duplicate entries for the same date are handled. Prefer allowing users to edit or replace that date's measurement rather than silently creating confusing duplicate points."
  // Find by same day
  const start = new Date(input.timestamp)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  const existingSameDay = await database.bodyweight_logs
    .where('timestamp')
    .between(start.getTime(), end.getTime())
    .toArray()
  if (existingSameDay.length > 0) {
    const existing = existingSameDay[0]
    const next: BodyweightLog = { ...existing, weight_kg: input.weightKg, timestamp: input.timestamp, notes: input.notes }
    await database.bodyweight_logs.put(next)
    return existing.id
  }
  return addBodyweightLog(input, database)
}

export async function deleteBodyweightLog(id: string, database: GymbroDatabase = defaultDatabase): Promise<void> {
  await database.bodyweight_logs.delete(id)
}
