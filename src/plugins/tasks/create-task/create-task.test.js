import { describe, test, expect, beforeEach, vi } from 'vitest'

import createTask from './create-task.js'
import {
  buildH,
  buildRequest
} from '../../../common/test-helpers/hapi-mocks.js'
import { ConflictError } from '../../../common/errors/index.js'

const { service } = vi.hoisted(() => ({ service: { createTask: vi.fn() } }))

vi.mock('../services/task-service.js', () => ({
  TaskService: vi.fn(function () {
    return service
  })
}))

const dbRow = {
  id: 7n,
  title: 'Review bundle',
  description: null,
  status: 'TODO',
  due_date_time: new Date('2026-11-30T17:00:00.000Z'),
  created_at: new Date('2026-10-22T09:15:30.000Z')
}

describe('create-task route', () => {
  let h

  beforeEach(() => {
    h = buildH()
  })

  describe('route configuration', () => {
    test('is a POST to /api/v1/tasks', () => {
      expect(createTask.method).toBe('POST')
      expect(createTask.path).toBe('/api/v1/tasks')
    })

    test('is documented for swagger', () => {
      expect(createTask.options.tags).toEqual(['api', 'tasks'])
      expect(createTask.options.description).toBeDefined()
    })

    test('validates the payload', () => {
      expect(createTask.options.validate.payload).toBeDefined()
      expect(createTask.options.validate.failAction).toBeTypeOf('function')
    })
  })

  describe('handler', () => {
    test('creates the task and returns 201 with its Location', async () => {
      service.createTask.mockResolvedValue(dbRow)
      const request = buildRequest({
        payload: { title: 'Review bundle', dueDateTime: '2026-11-30T17:00:00' }
      })

      await createTask.handler(request, h)

      expect(service.createTask).toHaveBeenCalledWith(request.payload)
      expect(h.response).toHaveBeenCalledWith({
        id: 7,
        title: 'Review bundle',
        description: null,
        status: 'TODO',
        dueDateTime: '2026-11-30T17:00:00',
        createdAt: '2026-10-22T09:15:30.000Z'
      })
      expect(h.code).toHaveBeenCalledWith(201)
      expect(h.header).toHaveBeenCalledWith('Location', '/api/v1/tasks/7')
    })

    test('returns 409 when the title is already used', async () => {
      service.createTask.mockRejectedValue(
        new ConflictError('exists', 'TASK_TITLE_DUPLICATE', 'title')
      )

      await createTask.handler(buildRequest(), h)

      expect(h.response).toHaveBeenCalledWith({
        errors: [
          {
            errorCode: 'TASK_TITLE_DUPLICATE',
            message: 'exists',
            field: 'title'
          }
        ]
      })
      expect(h.code).toHaveBeenCalledWith(409)
    })

    test('returns a generic 500 for an unexpected error', async () => {
      service.createTask.mockRejectedValue(new Error('db down'))

      await createTask.handler(buildRequest(), h)

      expect(h.response).toHaveBeenCalledWith({
        errors: [
          {
            errorCode: 'TASK_CREATION_FAILED',
            message: 'Failed to create task',
            field: null
          }
        ]
      })
      expect(h.code).toHaveBeenCalledWith(500)
    })
  })
})
