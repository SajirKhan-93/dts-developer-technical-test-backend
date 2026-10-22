import { describe, test, expect } from 'vitest'
import {
  checkTitleSchema,
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskStatusSchema
} from './schema.js'

const validate = (schema, value) =>
  schema.validate(value, { abortEarly: false })

const codes = (result) => result.error.details.map((d) => d.message)

describe('tasks schema', () => {
  describe('createTaskSchema', () => {
    test('accepts a minimal task and defaults status to TODO', () => {
      const { error, value } = validate(createTaskSchema, {
        title: '  Review bundle ',
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(error).toBeUndefined()
      expect(value.title).toBe('Review bundle')
      expect(value.status).toBe('TODO')
    })

    test('accepts an empty or null description', () => {
      expect(
        validate(createTaskSchema, {
          title: 'T',
          description: '',
          dueDateTime: '2026-11-30T17:00'
        }).error
      ).toBeUndefined()
      expect(
        validate(createTaskSchema, {
          title: 'T',
          description: null,
          dueDateTime: '2026-11-30T17:00'
        }).error
      ).toBeUndefined()
    })

    test('requires a title and due date/time', () => {
      const result = validate(createTaskSchema, {})

      expect(codes(result)).toEqual([
        'TASK_TITLE_REQUIRED',
        'TASK_DUE_DATE_TIME_REQUIRED'
      ])
    })

    test('rejects a blank title', () => {
      const result = validate(createTaskSchema, {
        title: '   ',
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(codes(result)).toEqual(['TASK_TITLE_REQUIRED'])
    })

    test('rejects a title and description that are too long', () => {
      const result = validate(createTaskSchema, {
        title: 'a'.repeat(256),
        description: 'a'.repeat(2001),
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(codes(result)).toEqual([
        'TASK_TITLE_TOO_LONG',
        'TASK_DESCRIPTION_TOO_LONG'
      ])
    })

    test('rejects an unknown status', () => {
      const result = validate(createTaskSchema, {
        title: 'T',
        status: 'DONE',
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(codes(result)).toEqual(['TASK_STATUS_INVALID'])
    })

    test.each(['tomorrow', '2026-02-31T10:00:00', '2026-11-30'])(
      'rejects the invalid due date/time %s',
      (dueDateTime) => {
        const result = validate(createTaskSchema, { title: 'T', dueDateTime })

        expect(codes(result)).toEqual(['TASK_DUE_DATE_TIME_INVALID'])
      }
    )

    test('rejects unknown fields', () => {
      const result = validate(createTaskSchema, {
        title: 'T',
        dueDateTime: '2026-11-30T17:00:00',
        extra: true
      })

      expect(codes(result)).toEqual(['VALIDATION_UNKNOWN_FIELD'])
    })

    test('rejects a missing body', () => {
      expect(codes(validate(createTaskSchema, null))).toEqual([
        'VALIDATION_INVALID_OBJECT'
      ])
    })
  })

  describe('updateTaskStatusSchema', () => {
    test('accepts a valid status', () => {
      expect(
        validate(updateTaskStatusSchema, { status: 'COMPLETED' }).error
      ).toBeUndefined()
    })

    test('requires a status', () => {
      expect(codes(validate(updateTaskStatusSchema, {}))).toEqual([
        'TASK_STATUS_REQUIRED'
      ])
    })

    test('rejects an unknown status', () => {
      expect(codes(validate(updateTaskStatusSchema, { status: 'x' }))).toEqual([
        'TASK_STATUS_INVALID'
      ])
    })
  })

  describe('taskIdParamsSchema', () => {
    test('converts a numeric id', () => {
      expect(validate(taskIdParamsSchema, { id: '12' }).value.id).toBe(12)
    })

    test.each(['abc', '0', '-1', '1.5'])('rejects id %s', (id) => {
      expect(codes(validate(taskIdParamsSchema, { id }))).toEqual([
        'TASK_ID_INVALID'
      ])
    })
  })

  describe('listTasksQuerySchema', () => {
    test('accepts no search', () => {
      expect(validate(listTasksQuerySchema, {}).error).toBeUndefined()
    })

    test('trims the search', () => {
      expect(
        validate(listTasksQuerySchema, { search: ' bundle ' }).value
      ).toEqual({ search: 'bundle' })
    })

    test('allows an empty search', () => {
      expect(
        validate(listTasksQuerySchema, { search: '' }).error
      ).toBeUndefined()
    })

    test('rejects a search that is too long', () => {
      expect(
        codes(validate(listTasksQuerySchema, { search: 'a'.repeat(256) }))
      ).toEqual(['TASK_SEARCH_TOO_LONG'])
    })

    test('rejects unknown parameters', () => {
      expect(codes(validate(listTasksQuerySchema, { page: '2' }))).toEqual([
        'VALIDATION_UNKNOWN_FIELD'
      ])
    })
  })

  describe('checkTitleSchema', () => {
    test('accepts a title with an optional id', () => {
      expect(
        validate(checkTitleSchema, { title: 'T', id: 3 }).error
      ).toBeUndefined()
      expect(validate(checkTitleSchema, { title: 'T' }).error).toBeUndefined()
    })

    test('requires a title and a valid id', () => {
      expect(codes(validate(checkTitleSchema, { id: 'x' }))).toEqual([
        'TASK_TITLE_REQUIRED',
        'TASK_ID_INVALID'
      ])
    })
  })
})
