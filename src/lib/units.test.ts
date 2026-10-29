import { describe, expect, it } from 'vitest'
import {
  formatNumber,
  formatVolume,
  formatWeight,
  kgToLb,
  KG_PER_LB,
  lbToKg,
  parseDecimal,
  parseWeightInput,
  roundTo,
  roundToStep,
  toDisplayWeight,
  toStorageKg,
} from './units'

describe('unit conversion (ONBD-003)', () => {
  it('uses the exact pound definition', () => {
    expect(KG_PER_LB).toBe(0.45359237)
  })

  it('converts kg → lbs and back without drift', () => {
    expect(kgToLb(100)).toBeCloseTo(220.4623, 3)
    expect(lbToKg(kgToLb(100))).toBeCloseTo(100, 10)
    expect(toDisplayWeight(100, 'kg')).toBe(100)
    expect(toDisplayWeight(100, 'lbs')).toBeCloseTo(220.4623, 3)
  })

  it('stores kilograms no matter which unit was typed', () => {
    expect(toStorageKg(100, 'kg')).toBe(100)
    expect(toStorageKg(225, 'lbs')).toBeCloseTo(102.058, 3)
    // 0.001 kg = 1 g of precision is plenty for a gym log.
    expect(String(toStorageKg(225, 'lbs'))).toMatch(/^\d+(\.\d{1,3})?$/)
  })
})

describe('rounding helpers', () => {
  it('rounds half-up and normalises negative zero', () => {
    expect(roundTo(102.4567, 3)).toBe(102.457)
    expect(roundTo(-0.0001, 2)).toBe(0)
  })

  it('snaps to plate increments', () => {
    expect(roundToStep(102.3, 2.5)).toBe(102.5)
    expect(roundToStep(101.2, 2.5)).toBe(100)
    expect(roundToStep(60, 2.5)).toBe(60)
    expect(roundToStep(60, 0)).toBe(60)
    expect(roundToStep(60, Number.NaN)).toBe(60)
  })
})

describe('locale-aware formatting (I18N-003)', () => {
  it('formats weights in the active unit and locale', () => {
    expect(formatWeight(102.5, 'kg', 'en-US')).toBe('102.5')
    expect(formatWeight(102.5, 'kg', 'id-ID')).toBe('102,5')
    expect(formatWeight(105, 'kg', 'en-US')).toBe('105')
    expect(formatWeight(100, 'lbs', 'en-US')).toBe('220.5')
    expect(formatWeight(100, 'lbs', 'id-ID')).toBe('220,5')
  })

  it('appends the dictionary unit label when provided', () => {
    expect(formatWeight(105, 'kg', 'en-US', { unitLabel: 'kg' })).toBe('105 kg')
    expect(formatWeight(105, 'kg', 'en-US', { decimals: 2, unitLabel: 'kg' })).toBe('105 kg')
  })

  it('formats volume as grouped whole numbers', () => {
    expect(formatVolume(12450, 'kg', 'en-US')).toBe('12,450')
    expect(formatVolume(12450, 'kg', 'id-ID')).toBe('12.450')
  })

  it('uses the Intl grouping/decimal separators', () => {
    expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5')
    expect(formatNumber(1234.5, 'id-ID')).toBe('1.234,5')
  })
})

describe('decimal parsing (accepts both separator conventions)', () => {
  it('parses plain decimals', () => {
    expect(parseDecimal('12.5')).toBe(12.5)
    expect(parseDecimal('12,5')).toBe(12.5)
    expect(parseDecimal(' 10 ')).toBe(10)
    expect(parseDecimal('-5')).toBe(-5)
    expect(parseDecimal('0')).toBe(0)
  })

  it('treats the right-most separator as the decimal point', () => {
    expect(parseDecimal('1,234.5')).toBe(1234.5)
    expect(parseDecimal('1.234,5')).toBe(1234.5)
  })

  it('rejects empty and malformed input instead of guessing', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('   ')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('1.2.3')).toBeNull()
    expect(parseDecimal('12kg')).toBeNull()
  })

  it('returns storage-ready kilograms from a unit-aware input', () => {
    expect(parseWeightInput('100', 'kg')).toBe(100)
    expect(parseWeightInput('102,5', 'kg')).toBe(102.5)
    expect(parseWeightInput('225', 'lbs')).toBeCloseTo(102.058, 3)
    expect(parseWeightInput('', 'kg')).toBeNull()
  })
})
