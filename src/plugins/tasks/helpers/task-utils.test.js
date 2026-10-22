import { describe, test, expect } from 'vitest'
import {
  formatLocalDateTime,
  parseLocalDateTime,
  serializeTask
} from './task-utils.js'

describe('task-utils', () => {
  describe('parseLocalDateTime', () => {
    test('parses a date-time with seconds', () => {
      expect(parseLocalDateTime('2026-11-30T17:05:09')?.toISOString()).toBe(
        '2026-11-30T17:05:09.000Z'
      )
    })

    test('parses a date-time without seconds', () => {
      expect(parseLocalDateTime('2026-11-30T17:05')?.toISOString()).toBe(
        '2026-11-30T17:05:00.000Z'
      )
    })

    test.each([
      'tomorrow',
      '2026-11-30',
      '2026-11-30T17:05:00Z',
      '2026-02-31T10:00:00',
      '2026-13-01T10:00:00',
      '2026-11-30T24:00:00',
      '2026-11-30T10:60:00',
      '2026-11-30T10:00:60'
    ])('rejects %s', (value) => {
      expect(parseLocalDateTime(value)).toBeNull()
    })
  })

  describe('formatLocalDateTime', () => {
    test('formats without a timezone or milliseconds', () => {
      expect(formatLocalDateTime(new Date('2026-11-30T17:00:00.000Z'))).toBe(
        '2026-11-30T17:00:00'
      )
    })
  })

  describe('serializeTask', () => {
    test('converts the database row to the API shape', () => {
      expect(
        serializeTask({
          id: 7n,
          title: 'Review',
          description: null,
          status: 'TODO',
          due_date_time: new Date('2026-11-30T17:00:00.000Z'),
          created_at: new Date('2026-10-22T09:15:30.000Z')
        })
      ).toEqual({
        id: 7,
        title: 'Review',
        description: null,
        status: 'TODO',
        dueDateTime: '2026-11-30T17:00:00',
        createdAt: '2026-10-22T09:15:30.000Z'
      })
    })
  })
})
