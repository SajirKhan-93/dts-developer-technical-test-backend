import { describe, test, expect, beforeEach, vi } from 'vitest'

import listTasks from './list-tasks.js'
import {
  buildH,
  buildRequest
} from '../../../common/test-helpers/hapi-mocks.js'

const { service } = vi.hoisted(() => ({ service: { getTasks: vi.fn() } }))

vi.mock('../services/task-service.js', () => ({
  TaskService: vi.fn(function () {
    return service
  })
}))

const dbRow = (id) => ({
  id,
  title: `Task ${id}`,
  description: 'detail',
  status: 'IN_PROGRESS',
  due_date_time: new Date('2026-11-30T17:00:00.000Z'),
  created_at: new Date('2026-10-22T09:15:30.000Z')
})

describe('list-tasks route', () => {
  let h

  beforeEach(() => {
    h = buildH()
  })

  describe('route configuration', () => {
    test('is a GET to /api/v1/tasks', () => {
      expect(listTasks.method).toBe('GET')
      expect(listTasks.path).toBe('/api/v1/tasks')
    })

    test('validates the query', () => {
      expect(listTasks.options.validate.query).toBeDefined()
      expect(listTasks.options.validate.failAction).toBeTypeOf('function')
    })

    test('is documented for swagger', () => {
      expect(listTasks.options.tags).toEqual(['api', 'tasks'])
    })
  })

  describe('handler', () => {
    test('returns every task in the API shape', async () => {
      service.getTasks.mockResolvedValue([dbRow(2n), dbRow(1n)])

      await listTasks.handler(buildRequest({ query: {} }), h)

      const [body] = h.response.mock.calls[0]
      expect(body.map((task) => task.id)).toEqual([2, 1])
      expect(body[0]).toEqual({
        id: 2,
        title: 'Task 2',
        description: 'detail',
        status: 'IN_PROGRESS',
        dueDateTime: '2026-11-30T17:00:00',
        createdAt: '2026-10-22T09:15:30.000Z'
      })
      expect(h.code).toHaveBeenCalledWith(200)
    })

    test('passes the search to the service', async () => {
      service.getTasks.mockResolvedValue([])

      await listTasks.handler(buildRequest({ query: { search: 'bundle' } }), h)

      expect(service.getTasks).toHaveBeenCalledWith({ search: 'bundle' })
      expect(h.response).toHaveBeenCalledWith([])
    })

    test('returns a generic 500 for an unexpected error', async () => {
      service.getTasks.mockRejectedValue(new Error('db down'))

      await listTasks.handler(buildRequest(), h)

      expect(h.response.mock.calls[0][0].errors[0].errorCode).toBe(
        'TASK_LIST_FAILED'
      )
      expect(h.code).toHaveBeenCalledWith(500)
    })
  })
})
