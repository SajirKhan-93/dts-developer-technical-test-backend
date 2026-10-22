import { describe, test, expect, beforeEach, vi } from 'vitest'
import Hapi from '@hapi/hapi'

import tasksPlugin from './index.js'
import { failAction } from '../../common/helpers/fail-action.js'
import { boomToErrorResponse } from '../../common/helpers/boom-to-error-response.js'
import { createFakePrisma } from '../../common/test-helpers/fake-prisma.js'

describe('tasks routes', () => {
  let server

  const create = (payload) =>
    server.inject({ method: 'POST', url: '/api/v1/tasks', payload })

  beforeEach(async () => {
    server = Hapi.server({
      routes: {
        validate: { options: { abortEarly: false }, failAction }
      }
    })
    server.decorate('server', 'logger', {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    })
    server.decorate('request', 'prisma', createFakePrisma())
    server.ext('onPreResponse', boomToErrorResponse)
    await server.register(tasksPlugin)
  })

  describe('POST /api/v1/tasks', () => {
    test('creates a task and returns 201 with a Location header', async () => {
      const res = await create({
        title: 'Review bundle',
        description: 'Check it',
        dueDateTime: '2026-11-30T17:00:00'
      })

      expect(res.statusCode).toBe(201)
      expect(res.headers.location).toBe('/api/v1/tasks/1')
      expect(res.result).toEqual({
        id: 1,
        title: 'Review bundle',
        description: 'Check it',
        status: 'TODO',
        dueDateTime: '2026-11-30T17:00:00',
        createdAt: expect.any(String)
      })
    })

    test('returns validation errors for an invalid task', async () => {
      const res = await create({ title: ' ', dueDateTime: 'tomorrow' })

      expect(res.statusCode).toBe(400)
      expect(res.result).toEqual({
        validationErrors: [
          { field: 'title', errorCode: 'TASK_TITLE_REQUIRED' },
          { field: 'dueDateTime', errorCode: 'TASK_DUE_DATE_TIME_INVALID' }
        ]
      })
    })

    test('returns 400 for a missing body', async () => {
      const res = await server.inject({ method: 'POST', url: '/api/v1/tasks' })

      expect(res.statusCode).toBe(400)
      expect(res.result.validationErrors[0].errorCode).toBe(
        'VALIDATION_INVALID_OBJECT'
      )
    })

    test('returns 400 in the common error shape for malformed JSON', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/tasks',
        headers: { 'content-type': 'application/json' },
        payload: '{not json'
      })

      expect(res.statusCode).toBe(400)
      expect(res.result.errors[0].errorCode).toBe('BAD_REQUEST')
    })
  })

  describe('GET /api/v1/tasks', () => {
    test('returns an empty list when there are no tasks', async () => {
      const res = await server.inject('/api/v1/tasks')

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual([])
    })

    test('returns tasks newest created first, whatever their due date', async () => {
      await create({ title: 'First', dueDateTime: '2026-12-01T09:00:00' })
      await create({ title: 'Second', dueDateTime: '2026-11-01T09:00:00' })

      const res = await server.inject('/api/v1/tasks')

      expect(res.result.map((task) => task.title)).toEqual(['Second', 'First'])
      expect(res.result[0].createdAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      )
    })

    test('searches titles case-insensitively', async () => {
      await create({
        title: 'Review bundle',
        dueDateTime: '2026-12-01T09:00:00'
      })
      await create({
        title: 'Call witness',
        dueDateTime: '2026-12-02T09:00:00'
      })
      await create({
        title: 'Bundle index',
        dueDateTime: '2026-12-03T09:00:00'
      })

      const res = await server.inject('/api/v1/tasks?search=BUNDLE')

      expect(res.result.map((task) => task.title)).toEqual([
        'Bundle index',
        'Review bundle'
      ])
    })

    test.each([
      [`search=${'a'.repeat(256)}`, 'TASK_SEARCH_TOO_LONG'],
      ['page=2', 'VALIDATION_UNKNOWN_FIELD']
    ])('returns 400 for %s', async (query, errorCode) => {
      const res = await server.inject(`/api/v1/tasks?${query}`)

      expect(res.statusCode).toBe(400)
      expect(res.result.validationErrors[0].errorCode).toBe(errorCode)
    })
  })

  describe('titles are unique', () => {
    const task = { title: 'Review bundle', dueDateTime: '2026-12-01T09:00:00' }

    test('POST /api/v1/tasks rejects a duplicate title with 409', async () => {
      await create(task)

      const res = await create({ ...task, title: '  review   BUNDLE ' })

      expect(res.statusCode).toBe(409)
      expect(res.result.errors[0]).toEqual({
        errorCode: 'TASK_TITLE_DUPLICATE',
        message: 'A task with this title already exists',
        field: 'title'
      })
    })

    test('stores the title with repeated spaces collapsed', async () => {
      const res = await create({ ...task, title: ' Review   bundle ' })

      expect(res.result.title).toBe('Review bundle')
    })

    test('POST /api/v1/tasks/check-title says an unused title is valid', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/tasks/check-title',
        payload: { title: 'Brand new' }
      })

      expect(res.statusCode).toBe(200)
      expect(res.result).toEqual({ title: 'Brand new', valid: true })
    })

    test('POST /api/v1/tasks/check-title rejects a title that is taken', async () => {
      await create(task)

      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/tasks/check-title',
        payload: { title: 'REVIEW BUNDLE' }
      })

      expect(res.statusCode).toBe(400)
      expect(res.result.validationErrors).toEqual([
        {
          errorCode: 'TASK_TITLE_DUPLICATE',
          message: 'A task with this title already exists',
          field: 'title'
        }
      ])
    })

    test('POST /api/v1/tasks/check-title ignores the task with the given id', async () => {
      await create(task)

      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/tasks/check-title',
        payload: { title: 'Review bundle', id: 1 }
      })

      expect(res.statusCode).toBe(200)
    })

    test('POST /api/v1/tasks/check-title validates the title', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/tasks/check-title',
        payload: { title: ' ' }
      })

      expect(res.statusCode).toBe(400)
      expect(res.result.validationErrors).toEqual([
        { field: 'title', errorCode: 'TASK_TITLE_REQUIRED' }
      ])
    })
  })

  describe('GET /api/v1/tasks/{id}', () => {
    test('returns the task', async () => {
      await create({ title: 'T', dueDateTime: '2026-12-01T09:00:00' })

      const res = await server.inject('/api/v1/tasks/1')

      expect(res.statusCode).toBe(200)
      expect(res.result.title).toBe('T')
    })

    test('returns 404 when the task does not exist', async () => {
      const res = await server.inject('/api/v1/tasks/99')

      expect(res.statusCode).toBe(404)
      expect(res.result.errors[0]).toEqual({
        errorCode: 'TASK_NOT_FOUND',
        message: 'Task with id 99 not found',
        field: 'id'
      })
    })

    test('returns 400 for a non-numeric id', async () => {
      const res = await server.inject('/api/v1/tasks/abc')

      expect(res.statusCode).toBe(400)
      expect(res.result.validationErrors).toEqual([
        { field: 'id', errorCode: 'TASK_ID_INVALID' }
      ])
    })
  })

  describe('PATCH /api/v1/tasks/{id}/status', () => {
    beforeEach(async () => {
      await create({ title: 'T', dueDateTime: '2026-12-01T09:00:00' })
    })

    test('updates the status', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: '/api/v1/tasks/1/status',
        payload: { status: 'COMPLETED' }
      })

      expect(res.statusCode).toBe(200)
      expect(res.result.status).toBe('COMPLETED')
    })

    test('returns 400 when the status is missing or invalid', async () => {
      const missing = await server.inject({
        method: 'PATCH',
        url: '/api/v1/tasks/1/status',
        payload: {}
      })
      const invalid = await server.inject({
        method: 'PATCH',
        url: '/api/v1/tasks/1/status',
        payload: { status: 'DONE' }
      })

      expect(missing.statusCode).toBe(400)
      expect(missing.result.validationErrors[0].errorCode).toBe(
        'TASK_STATUS_REQUIRED'
      )
      expect(invalid.statusCode).toBe(400)
      expect(invalid.result.validationErrors[0].errorCode).toBe(
        'TASK_STATUS_INVALID'
      )
    })

    test('returns 404 when the task does not exist', async () => {
      const res = await server.inject({
        method: 'PATCH',
        url: '/api/v1/tasks/42/status',
        payload: { status: 'TODO' }
      })

      expect(res.statusCode).toBe(404)
    })
  })

  describe('DELETE /api/v1/tasks/{id}', () => {
    test('deletes the task and returns 204', async () => {
      await create({ title: 'T', dueDateTime: '2026-12-01T09:00:00' })

      const res = await server.inject({
        method: 'DELETE',
        url: '/api/v1/tasks/1'
      })
      const after = await server.inject('/api/v1/tasks/1')

      expect(res.statusCode).toBe(204)
      expect(after.statusCode).toBe(404)
    })

    test('returns 404 when the task does not exist', async () => {
      const res = await server.inject({
        method: 'DELETE',
        url: '/api/v1/tasks/1'
      })

      expect(res.statusCode).toBe(404)
    })
  })

  test('unknown routes use the common error shape', async () => {
    const res = await server.inject('/nope')

    expect(res.statusCode).toBe(404)
    expect(res.result.errors[0].errorCode).toBe('NOT_FOUND')
  })
})
