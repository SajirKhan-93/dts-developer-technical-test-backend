import { describe, test, expect, beforeEach, vi } from 'vitest'

import getTask from './get-task.js'
import {
  buildH,
  buildRequest
} from '../../../common/test-helpers/hapi-mocks.js'
import { NotFoundError } from '../../../common/errors/index.js'

const { service } = vi.hoisted(() => ({ service: { getTaskById: vi.fn() } }))

vi.mock('../services/task-service.js', () => ({
  TaskService: vi.fn(function () {
    return service
  })
}))

describe('get-task route', () => {
  let h

  beforeEach(() => {
    h = buildH()
  })

  describe('route configuration', () => {
    test('is a GET to /api/v1/tasks/{id}', () => {
      expect(getTask.method).toBe('GET')
      expect(getTask.path).toBe('/api/v1/tasks/{id}')
    })

    test('validates the id', () => {
      expect(getTask.options.validate.params).toBeDefined()
      expect(getTask.options.validate.failAction).toBeTypeOf('function')
    })
  })

  describe('handler', () => {
    test('returns the task', async () => {
      service.getTaskById.mockResolvedValue({
        id: 3n,
        title: 'T',
        description: null,
        status: 'TODO',
        due_date_time: new Date('2026-11-30T17:00:00.000Z'),
        created_at: new Date('2026-10-22T09:15:30.000Z')
      })

      await getTask.handler(buildRequest({ params: { id: 3 } }), h)

      expect(service.getTaskById).toHaveBeenCalledWith(3)
      expect(h.response.mock.calls[0][0]).toMatchObject({ id: 3, title: 'T' })
      expect(h.code).toHaveBeenCalledWith(200)
    })

    test('returns 404 when the task does not exist', async () => {
      service.getTaskById.mockRejectedValue(
        new NotFoundError('Task with id 9 not found', 'TASK_NOT_FOUND', 'id')
      )

      await getTask.handler(buildRequest({ params: { id: 9 } }), h)

      expect(h.response).toHaveBeenCalledWith({
        errors: [
          {
            errorCode: 'TASK_NOT_FOUND',
            message: 'Task with id 9 not found',
            field: 'id'
          }
        ]
      })
      expect(h.code).toHaveBeenCalledWith(404)
    })

    test('returns a generic 500 for an unexpected error', async () => {
      service.getTaskById.mockRejectedValue(new Error('db down'))

      await getTask.handler(buildRequest({ params: { id: 1 } }), h)

      expect(h.response.mock.calls[0][0].errors[0].errorCode).toBe(
        'TASK_RETRIEVAL_FAILED'
      )
      expect(h.code).toHaveBeenCalledWith(500)
    })
  })
})
